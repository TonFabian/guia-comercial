import type { Category, City, Company } from '../types/domain';

/** Rótulo legível de uma categoria (pode vir populada ou só o id). */
export function categoryLabel(category: string | Category | undefined): string {
  if (!category) return '—';
  return typeof category === 'string' ? category : category.name;
}

/** Id da categoria, usado como valor dos selects. */
export function categoryId(category: string | Category | undefined): string {
  if (!category) return '';
  return typeof category === 'string' ? category : category._id;
}

/** Rótulo legível de uma empresa (pode vir populada ou só o id). */
export function companyLabel(company: string | Company | undefined): string {
  if (!company) return '—';
  return typeof company === 'string' ? company : company.name;
}

/** Id da empresa, usado como valor dos selects. */
export function companyId(company: string | Company | undefined): string {
  if (!company) return '';
  return typeof company === 'string' ? company : company._id;
}

/** Rótulo legível do plano comercial (ausente → Gratuito). */
export function planLabel(plan: Company['plan']): string {
  if (plan === 'premium') return 'Premium';
  if (plan === 'basic') return 'Básico';
  return 'Gratuito';
}

/** Rótulo legível de uma cidade (pode vir populada ou só o id/slug). */
export function cityLabel(city: string | City | undefined | null): string {
  if (!city) return '—';
  return typeof city === 'string' ? city : city.name;
}

/**
 * Slug da cidade de um registro.
 *
 * A API de empresas resolve `city` por slug (é o que o serviço faz antes de
 * gravar a referência), então o select de cidades trabalha com slug.
 */
export function citySlug(city: string | City | undefined | null, cities: City[]): string {
  if (!city) return '';
  if (typeof city !== 'string') return city.slug;
  const found = cities.find((option) => option._id === city);
  return found ? found.slug : city;
}
