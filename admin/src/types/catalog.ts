import type { Category, City, Company } from './domain';

/**
 * Recursos de referência carregados uma única vez e compartilhados pelas
 * seções que precisam de opções (selects de categoria, cidade e empresa).
 */
export interface Catalog {
  categories: Category[];
  cities: City[];
  /** Empresas usadas como opção nos selects de Cupons e Vagas. */
  companyOptions: Company[];
  /** Total de empresas no backend — a lista de opções é limitada a 100 itens. */
  companyOptionsTotal: number;
}

/** Recurso do catálogo — usado para rotular o erro de carregamento. */
export type CatalogResource = 'categories' | 'cities' | 'companyOptions';

/** Erro de carregamento por recurso do catálogo (um por seção afetada). */
export type CatalogErrors = Partial<Record<CatalogResource, string>>;
