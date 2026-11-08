/**
 * Regras puras de paginação e filtragem da busca de empresas.
 *
 * O filtro de categoria é aplicado no servidor (vários slugs separados por
 * vírgula). "Aberto agora" e "Perto de mim" não existem no backend: nesse
 * caso o app consome as páginas do servidor em sequência, acumulando os
 * resultados que passam no filtro local.
 */
import { isOpenNow, isOpenNowFromSchedule, parseOpeningHours } from '@/features/company/opening-hours';
import type { Company } from '@/types/domain';

/** Quantidade de empresas buscadas por página. */
export const SEARCH_PAGE_SIZE = 20;

/** Filtros ativos na busca. */
export type SearchFilters = {
  term: string;
  categorySlugs: string[];
  openNowOnly: boolean;
  nearMeCity: string | null;
};

/** Página de empresas devolvida pelo backend. */
export type CompanyPage = {
  items: Company[];
  total: number;
  page: number;
  pageSize: number;
};

/** Função que busca uma página do servidor (injetada para facilitar testes). */
export type CompanyPageFetcher = (
  filters: SearchFilters,
  page: number,
  pageSize: number,
) => Promise<CompanyPage>;

/** Estado acumulado da busca. */
export type SearchState = {
  /** Todos os itens que o servidor devolveu até agora (sem filtro local). */
  loaded: Company[];
  /** Total do servidor para o filtro atual (categoria + termo). */
  serverTotal: number;
  /** Última página do servidor consumida. */
  page: number;
  /** O servidor não tem mais páginas para esta busca. */
  exhausted: boolean;
};

/** O que a tela exibe. */
export type SearchView = {
  items: Company[];
  total: number;
  hasMore: boolean;
  nextPage: number;
};

/** Monta a query da API: categoria e termo vão para o servidor. */
export function buildCompanyQuery(
  filters: SearchFilters,
  page: number,
  pageSize: number,
): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const term = filters.term.trim();
  if (term) params.set('q', term);
  const slugs = filters.categorySlugs.map((slug) => slug.trim()).filter(Boolean);
  if (slugs.length > 0) params.set('category', slugs.join(','));
  return params.toString();
}

/** `true` quando há filtro que o servidor não aplica. */
export function hasLocalFilters(filters: SearchFilters): boolean {
  return filters.openNowOnly || Boolean(filters.nearMeCity);
}

/** Normaliza o nome da cidade para comparação (sem acento e caixa). */
export function normalizeCityName(value: string | { name?: string } | null | undefined): string {
  const name = typeof value === 'string' ? value : (value?.name ?? '');
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Aplica os filtros que só existem no cliente ("aberto agora", "perto de mim"). */
export function applyLocalFilters(
  companies: Company[],
  filters: SearchFilters,
  now: Date,
): Company[] {
  let result = companies;

  if (filters.nearMeCity) {
    const target = normalizeCityName(filters.nearMeCity);
    result = result.filter((company) => normalizeCityName(company.city) === target);
  }

  if (filters.openNowOnly) {
    result = result.filter((company) => {
      // schedule é a fonte da verdade; openingHours entra como fallback
      // enquanto a deprecação durar.
      const open = company.schedule && company.schedule.length > 0
        ? isOpenNowFromSchedule(company.schedule, now)
        : isOpenNow(parseOpeningHours(company.openingHours ?? []), now);
      return open === true;
    });
  }

  return result;
}

/**
 * Com filtro local, a carga inicial continua consumindo páginas do servidor
 * até ter resultados suficientes ou até o servidor acabar.
 */
export function shouldDrainMorePages(input: {
  filteredCount: number;
  targetCount: number;
  loadedCount: number;
  serverTotal: number;
}): boolean {
  if (input.filteredCount >= input.targetCount) return false;
  return input.loadedCount < input.serverTotal;
}

/**
 * O servidor acabou quando entregou tudo o que o `total` prometia ou quando
 * a página veio vazia (total inconsistente).
 */
function isServerExhausted(
  loadedCount: number,
  serverTotal: number,
  pageItemCount: number,
): boolean {
  if (pageItemCount === 0) return true;
  return loadedCount >= serverTotal;
}

/** Busca a primeira página; com filtro local, drena as páginas seguintes. */
export async function loadFirstPage(
  filters: SearchFilters,
  fetchPage: CompanyPageFetcher,
  pageSize: number = SEARCH_PAGE_SIZE,
  now: Date = new Date(),
): Promise<SearchState> {
  const first = await fetchPage(filters, 1, pageSize);
  let state: SearchState = {
    loaded: first.items,
    serverTotal: first.total,
    page: 1,
    exhausted: isServerExhausted(first.items.length, first.total, first.items.length),
  };

  if (!hasLocalFilters(filters)) return state;

  while (
    shouldDrainMorePages({
      filteredCount: applyLocalFilters(state.loaded, filters, now).length,
      targetCount: pageSize,
      loadedCount: state.loaded.length,
      serverTotal: state.serverTotal,
    }) &&
    !state.exhausted
  ) {
    const next = await fetchPage(filters, state.page + 1, pageSize);
    const loaded = [...state.loaded, ...next.items];
    state = {
      loaded,
      serverTotal: next.total,
      page: state.page + 1,
      exhausted: isServerExhausted(loaded.length, next.total, next.items.length),
    };
  }

  return state;
}

/** Carrega a página seguinte do servidor e anexa ao que já foi carregado. */
export async function loadNextPage(
  state: SearchState,
  filters: SearchFilters,
  fetchPage: CompanyPageFetcher,
  pageSize: number = SEARCH_PAGE_SIZE,
): Promise<SearchState> {
  const next = await fetchPage(filters, state.page + 1, pageSize);
  const loaded = [...state.loaded, ...next.items];
  return {
    loaded,
    serverTotal: next.total,
    page: state.page + 1,
    exhausted: isServerExhausted(loaded.length, next.total, next.items.length),
  };
}

/** Deriva o que a tela exibe a partir do estado acumulado. */
export function deriveSearchView(
  state: SearchState,
  filters: SearchFilters,
  now: Date,
): SearchView {
  const items = hasLocalFilters(filters)
    ? applyLocalFilters(state.loaded, filters, now)
    : state.loaded;

  return {
    items,
    total: hasLocalFilters(filters) ? items.length : state.serverTotal,
    hasMore: !state.exhausted,
    nextPage: state.page + 1,
  };
}
