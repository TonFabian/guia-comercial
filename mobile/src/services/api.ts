/**
 * Cliente tipado para a API do guia (somente chamadas de domínio — use estas
 * funções, nunca `fetch` direto nos componentes).
 *
 * O transporte mora em src/services/http.ts: lá ficam a base URL, o header de
 * sessão do Clerk e o comportamento de fallback (mock quando a env não está
 * definida ou a API está fora do ar; 401/403 reais estouram `ApiError`).
 */
import type { Banner, Category, Company, Coupon, Job, Paginated } from '@/types/domain';

import { isApiConfigured, request } from './http';
import type { RequestPayload } from './http';

import {
  MOCK_BANNERS,
  MOCK_CATEGORIES,
  MOCK_COUPONS,
  MOCK_COMPANIES,
  MOCK_FEATURED_COMPANY,
  MOCK_JOBS,
  MOCK_PHARMACY,
} from '@/data/mock';

function isPaginated<T>(payload: RequestPayload<T>): payload is Paginated<T> {
  return typeof payload === 'object' && payload !== null && 'items' in payload;
}

/** Extrai `items` de um `Paginated<T>` e aceita lista crua ou recurso único. */
function fromPaginated<T>(payload: RequestPayload<T> | null, fallback: T[]): T[] {
  if (!payload) return fallback;
  if (Array.isArray(payload)) return payload;
  if (isPaginated(payload)) return payload.items ?? fallback;
  return [payload];
}

export async function getCategories(): Promise<Category[]> {
  const payload = await request<Category>('/categories');
  return fromPaginated(payload, MOCK_CATEGORIES);
}

export async function getBanners(): Promise<Banner[]> {
  const payload = await request<Banner>('/banners');
  return fromPaginated(payload, MOCK_BANNERS);
}

export async function getCompanies(): Promise<Company[]> {
  const payload = await request<Company>('/companies');
  return fromPaginated(payload, MOCK_COMPANIES);
}

export async function getCoupons(): Promise<Coupon[]> {
  const payload = await request<Coupon>('/coupons');
  return fromPaginated(payload, MOCK_COUPONS);
}

/** Empresa pelo id. `null` quando a API responde que não existe. */
export async function getCompanyById(id: string): Promise<Company | null> {
  if (!isApiConfigured()) return findMockCompany(id);
  try {
    const payload = await request<Company>(`/companies/${encodeURIComponent(id)}`);
    if (!payload) return findMockCompany(id);
    const [company] = fromPaginated(payload, []);
    return company ?? findMockCompany(id);
  } catch {
    return findMockCompany(id);
  }
}

/** Cupons de uma empresa específica. */
export async function getCouponsByCompany(companyId: string): Promise<Coupon[]> {
  const payload = await request<Coupon>(`/coupons?company=${encodeURIComponent(companyId)}`);
  if (payload) return fromPaginated(payload, []);
  return filterMockCouponsByCompany(companyId);
}

export async function getJobs(): Promise<Job[]> {
  const payload = await request<Job>('/jobs');
  return fromPaginated(payload, MOCK_JOBS);
}

export async function getFeaturedCompany(): Promise<Company | null> {
  if (!isApiConfigured()) return MOCK_FEATURED_COMPANY;
  try {
    const payload = await request<Company>('/companies?featured=true');
    const items = fromPaginated(payload, MOCK_COMPANIES);
    const found = items.find((company) => company.isFeatured) ?? items[0] ?? null;
    return found ?? MOCK_FEATURED_COMPANY;
  } catch {
    return MOCK_FEATURED_COMPANY;
  }
}

export async function getPharmacyOnDuty(): Promise<Company | null> {
  if (!isApiConfigured()) return MOCK_PHARMACY;
  try {
    // O backend filtra empresas por slug de categoria (`category=farmacia`).
    const payload = await request<Company>('/companies?category=farmacia');
    const items = fromPaginated(payload, []);
    return items[0] ?? MOCK_PHARMACY;
  } catch {
    return MOCK_PHARMACY;
  }
}

export async function searchCompanies(query: string): Promise<Company[]> {
  const term = query.trim().toLowerCase();
  if (!isApiConfigured()) return filterMockCompanies(term);
  const payload = await request<Company>(`/companies?q=${encodeURIComponent(term)}`);
  return fromPaginated(payload, filterMockCompanies(term));
}

/** Empresas de uma categoria, identificada pelo slug (ex.: `farmacia`). */
export async function getCompaniesByCategory(slug: string): Promise<Company[]> {
  if (!isApiConfigured()) return filterMockCompaniesByCategory(slug);
  const payload = await request<Company>(`/companies?category=${encodeURIComponent(slug)}`);
  return fromPaginated(payload, filterMockCompaniesByCategory(slug));
}

export async function searchCategories(query: string): Promise<Category[]> {
  const term = query.trim().toLowerCase();
  if (!isApiConfigured()) return filterMockCategories(term);
  const payload = await request<Category>(`/categories?q=${encodeURIComponent(term)}`);
  return fromPaginated(payload, filterMockCategories(term));
}

export function filterMockCompanies(term: string): Company[] {
  if (!term) return MOCK_COMPANIES;
  return MOCK_COMPANIES.filter((company) => company.name.toLowerCase().includes(term));
}

/** Filtra as empresas mockadas pela categoria (aceita slug ou id). */
export function filterMockCompaniesByCategory(slug: string): Company[] {
  const category = MOCK_CATEGORIES.find(
    (item) => item.slug === slug || item._id === slug || item.name.toLowerCase() === slug.toLowerCase(),
  );
  if (!category) return MOCK_COMPANIES;
  return MOCK_COMPANIES.filter((company) => company.category === category._id);
}

export function filterMockCategories(term: string): Category[] {
  if (!term) return MOCK_CATEGORIES;
  return MOCK_CATEGORIES.filter((category) => category.name.toLowerCase().includes(term));
}

/** Empresa mockada pelo id (fallback quando a API está fora do ar). */
export function findMockCompany(id: string): Company | null {
  return MOCK_COMPANIES.find((company) => company._id === id) ?? null;
}

/** Cupons mockados que pertencem a uma empresa. */
export function filterMockCouponsByCompany(companyId: string): Coupon[] {
  return MOCK_COUPONS.filter((coupon) => {
    const company = coupon.company;
    return typeof company !== 'string' && company._id === companyId;
  });
}
