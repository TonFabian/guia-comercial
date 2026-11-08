import { describe, expect, it, vi } from 'vitest';

import type { Company } from '@/types/domain';

import {
  applyLocalFilters,
  buildCompanyQuery,
  deriveSearchView,
  hasLocalFilters,
  loadFirstPage,
  loadNextPage,
  shouldDrainMorePages,
} from './search-pagination';
import type { SearchFilters, SearchState } from './search-pagination';

function empresa(overrides: Partial<Company> & { _id: string }): Company {
  return {
    name: `Empresa ${overrides._id}`,
    slug: `empresa-${overrides._id}`,
    description: 'Descrição da empresa.',
    category: '1',
    ...overrides,
  };
}

const FILTROS_SEM_LOCAL: SearchFilters = {
  term: '',
  categorySlugs: [],
  openNowOnly: false,
  nearMeCity: null,
};

describe('buildCompanyQuery', () => {
  it('manda as categorias selecionadas para o servidor em uma única lista', () => {
    const query = buildCompanyQuery(
      { ...FILTROS_SEM_LOCAL, categorySlugs: ['farmacia', 'beleza'] },
      2,
      20,
    );
    const params = new URLSearchParams(query);

    expect(params.get('category')).toBe('farmacia,beleza');
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('20');
  });

  it('inclui o termo digitado e omite o filtro quando não há categoria', () => {
    const query = buildCompanyQuery({ ...FILTROS_SEM_LOCAL, term: 'pizza' }, 1, 20);
    const params = new URLSearchParams(query);

    expect(params.get('q')).toBe('pizza');
    expect(params.get('category')).toBeNull();
  });

  it('ignora slugs em branco', () => {
    const query = buildCompanyQuery(
      { ...FILTROS_SEM_LOCAL, categorySlugs: ['  ', 'servicos'] },
      1,
      20,
    );
    const params = new URLSearchParams(query);

    expect(params.get('category')).toBe('servicos');
  });
});

describe('hasLocalFilters', () => {
  it('reconhece os filtros que só existem no cliente', () => {
    expect(hasLocalFilters({ ...FILTROS_SEM_LOCAL, openNowOnly: true })).toBe(true);
    expect(hasLocalFilters({ ...FILTROS_SEM_LOCAL, nearMeCity: 'Castelo do Piauí' })).toBe(true);
  });

  it('não trata categoria nem termo como filtro local', () => {
    expect(
      hasLocalFilters({ ...FILTROS_SEM_LOCAL, term: 'pizza', categorySlugs: ['food'] }),
    ).toBe(false);
  });
});

describe('applyLocalFilters', () => {
  const agora = new Date('2024-01-01T10:00:00');

  it('mantém somente as empresas da cidade escolhida', () => {
    const itens = [
      empresa({ _id: '1', city: 'Castelo do Piauí' }),
      empresa({ _id: '2', city: 'Teresina' }),
    ];

    const resultado = applyLocalFilters(
      itens,
      { ...FILTROS_SEM_LOCAL, nearMeCity: 'castelo do piaui' },
      agora,
    );

    expect(resultado.map((item) => item._id)).toEqual(['1']);
  });

  it('mantém somente as empresas abertas agora', () => {
    const itens = [
      empresa({ _id: '1', openingHours: ['Seg a Sex 08h às 18h'] }),
      empresa({ _id: '2', openingHours: ['Seg a Sex 20h às 22h'] }),
    ];

    const resultado = applyLocalFilters(itens, { ...FILTROS_SEM_LOCAL, openNowOnly: true }, agora);

    expect(resultado.map((item) => item._id)).toEqual(['1']);
  });

  it('descarta quem não informa horário quando o filtro é "aberto agora"', () => {
    const itens = [empresa({ _id: '1' })];

    const resultado = applyLocalFilters(itens, { ...FILTROS_SEM_LOCAL, openNowOnly: true }, agora);

    expect(resultado).toHaveLength(0);
  });

  it('usa o schedule estruturado para decidir "aberto agora"', () => {
    const itens = [
      empresa({ _id: '1', schedule: [{ day: 1, opens: 600, closes: 1200 }] }),
      empresa({ _id: '2', schedule: [{ day: 1, opens: 900, closes: 1200 }] }),
      empresa({ _id: '3', schedule: [{ day: 1, opens: 500, closes: 1439 }] }),
    ];

    const resultado = applyLocalFilters(itens, { ...FILTROS_SEM_LOCAL, openNowOnly: true }, agora);

    expect(resultado.map((item) => item._id)).toEqual(['1', '3']);
  });

  it('caiu no meio da madrugada: faixa de sábado que fecha no domingo conta como aberta', () => {
    const madrugadaDeDomingo = new Date('2024-01-07T01:00:00');
    const itens = [
      empresa({
        _id: '1',
        schedule: [{ day: 6, opens: 1200, closes: 180 }],
      }),
    ];

    const resultado = applyLocalFilters(
      itens,
      { ...FILTROS_SEM_LOCAL, openNowOnly: true },
      madrugadaDeDomingo,
    );

    expect(resultado.map((item) => item._id)).toEqual(['1']);
  });

  it('prefere o schedule quando ele e o openingHours contam histórias diferentes', () => {
    const itens = [
      empresa({
        _id: '1',
        openingHours: ['Seg a Sex 20h às 22h'],
        schedule: [{ day: 1, opens: 600, closes: 1200 }],
      }),
    ];

    const resultado = applyLocalFilters(itens, { ...FILTROS_SEM_LOCAL, openNowOnly: true }, agora);

    expect(resultado.map((item) => item._id)).toEqual(['1']);
  });

  it('cai no fallback do openingHours quando o schedule vem vazio', () => {
    const itens = [
      empresa({
        _id: '1',
        openingHours: ['Seg a Sex 08h às 18h'],
        schedule: [],
      }),
    ];

    const resultado = applyLocalFilters(itens, { ...FILTROS_SEM_LOCAL, openNowOnly: true }, agora);

    expect(resultado.map((item) => item._id)).toEqual(['1']);
  });
});

describe('shouldDrainMorePages', () => {
  it('para quando já há resultados suficientes', () => {
    expect(
      shouldDrainMorePages({
        filteredCount: 20,
        targetCount: 20,
        loadedCount: 20,
        serverTotal: 100,
      }),
    ).toBe(false);
  });

  it('continua enquanto o servidor tem páginas e faltam resultados', () => {
    expect(
      shouldDrainMorePages({
        filteredCount: 3,
        targetCount: 20,
        loadedCount: 20,
        serverTotal: 100,
      }),
    ).toBe(true);
  });

  it('para quando o servidor já entregou tudo', () => {
    expect(
      shouldDrainMorePages({
        filteredCount: 0,
        targetCount: 20,
        loadedCount: 100,
        serverTotal: 100,
      }),
    ).toBe(false);
  });
});

describe('deriveSearchView', () => {
  const agora = new Date('2024-01-01T10:00:00');

  it('mostra o total do servidor quando não há filtro local', () => {
    const estado: SearchState = {
      loaded: [empresa({ _id: '1' })],
      serverTotal: 42,
      page: 1,
      exhausted: false,
    };

    const view = deriveSearchView(estado, FILTROS_SEM_LOCAL, agora);

    expect(view.total).toBe(42);
    expect(view.items).toHaveLength(1);
    expect(view.hasMore).toBe(true);
    expect(view.nextPage).toBe(2);
  });

  it('mostra a contagem filtrada disponível quando há filtro local', () => {
    const estado: SearchState = {
      loaded: [
        empresa({ _id: '1', city: 'Castelo do Piauí' }),
        empresa({ _id: '2', city: 'Teresina' }),
      ],
      serverTotal: 2,
      page: 1,
      exhausted: true,
    };

    const view = deriveSearchView(
      estado,
      { ...FILTROS_SEM_LOCAL, nearMeCity: 'Castelo do Piauí' },
      agora,
    );

    expect(view.total).toBe(1);
    expect(view.items.map((item) => item._id)).toEqual(['1']);
    expect(view.hasMore).toBe(false);
  });
});

describe('loadFirstPage', () => {
  it('busca apenas a primeira página quando o filtro é do servidor', async () => {
    const fetcher = vi.fn(async () => ({
      items: [empresa({ _id: '1' })],
      total: 100,
      page: 1,
      pageSize: 20,
    }));

    const estado = await loadFirstPage(FILTROS_SEM_LOCAL, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(estado.page).toBe(1);
    expect(estado.serverTotal).toBe(100);
    expect(estado.exhausted).toBe(false);
  });

  it('consome páginas em sequência até ter resultados suficientes', async () => {
    const paginas = [
      { items: [empresa({ _id: '1', city: 'Castelo do Piauí' }), empresa({ _id: '2', city: 'Teresina' })], total: 4, page: 1, pageSize: 2 },
      { items: [empresa({ _id: '3', city: 'Castelo do Piauí' }), empresa({ _id: '4', city: 'Teresina' })], total: 4, page: 2, pageSize: 2 },
    ];
    const fetcher = vi.fn(async (_filtros: SearchFilters, page: number) => paginas[page - 1]);

    const estado = await loadFirstPage(
      { ...FILTROS_SEM_LOCAL, nearMeCity: 'Castelo do Piauí' },
      fetcher,
      2,
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(estado.loaded).toHaveLength(4);
    expect(estado.page).toBe(2);
  });

  it('para quando o servidor acaba, mesmo sem nenhum resultado filtrado', async () => {
    const paginas = [
      { items: [empresa({ _id: '1', city: 'Teresina' }), empresa({ _id: '2', city: 'Teresina' })], total: 4, page: 1, pageSize: 2 },
      { items: [empresa({ _id: '3', city: 'Teresina' }), empresa({ _id: '4', city: 'Teresina' })], total: 4, page: 2, pageSize: 2 },
    ];
    const fetcher = vi.fn(async (_filtros: SearchFilters, page: number) => paginas[page - 1]);

    const estado = await loadFirstPage(
      { ...FILTROS_SEM_LOCAL, nearMeCity: 'Castelo do Piauí' },
      fetcher,
      2,
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(estado.exhausted).toBe(true);
  });
});

describe('loadNextPage', () => {
  it('acrescenta a próxima página ao que já foi carregado', async () => {
    const estado: SearchState = {
      loaded: [empresa({ _id: '1' })],
      serverTotal: 2,
      page: 1,
      exhausted: false,
    };
    const fetcher = vi.fn(async () => ({
      items: [empresa({ _id: '2' })],
      total: 2,
      page: 2,
      pageSize: 20,
    }));

    const proximo = await loadNextPage(estado, FILTROS_SEM_LOCAL, fetcher);

    expect(fetcher).toHaveBeenCalledWith(FILTROS_SEM_LOCAL, 2, 20);
    expect(proximo.loaded.map((item) => item._id)).toEqual(['1', '2']);
    expect(proximo.page).toBe(2);
    expect(proximo.exhausted).toBe(true);
  });
});
