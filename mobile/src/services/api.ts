/**
 * Cliente fetch tipado para a API do guia.
 *
 * Usa `process.env.EXPO_PUBLIC_API_URL` como base. Quando a env não está
 * definida ou qualquer chamada falha (backend desligado no Expo Go), cai
 * automaticamente nos dados mockados de src/data/mock.ts.
 */
import type { Banner, Category, Company, Coupon, Job, Paginated } from '@/types/domain';

import {
  MOCK_BANNERS,
  MOCK_CATEGORIES,
  MOCK_COUPONS,
  MOCK_COMPANIES,
  MOCK_FEATURED_COMPANY,
  MOCK_JOBS,
  MOCK_PHARMACY,
} from '@/data/mock';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/** Extrai `items` de um `Paginated<T>` ou aceita uma lista crua, com fallback. */
function fromPaginated<T>(payload: Paginated<T> | T[] | null, fallback: T[]): T[] {
  if (!payload) return fallback;
  if (Array.isArray(payload)) return payload;
  return payload.items ?? fallback;
}

type RequestInitLite = { signal?: AbortSignal };

async function request<T>(path: string, init?: RequestInitLite): Promise<Paginated<T> | T[] | null> {
  if (!BASE_URL) return null;
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      ...init,
    });
    if (!response.ok) return null;
    return (await response.json()) as Paginated<T> | T[];
  } catch {
    return null;
  }
}

/** Resultado de uma requisição de recurso único. */
type SingleResult<T> = {
  data: T | null;
  /** `true` quando a API não respondeu (sem env ou falha de rede). */
  offline: boolean;
};

async function requestOne<T>(path: string): Promise<SingleResult<T>> {
  if (!BASE_URL) return { data: null, offline: true };
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return { data: null, offline: false };
    return { data: (await response.json()) as T, offline: false };
  } catch {
    return { data: null, offline: true };
  }
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
  const { data, offline } = await requestOne<Company>(`/companies/${encodeURIComponent(id)}`);
  if (data) return data;
  return offline ? findMockCompany(id) : null;
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
  if (!BASE_URL) return MOCK_FEATURED_COMPANY;
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
  if (!BASE_URL) return MOCK_PHARMACY;
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
  if (!BASE_URL) return filterMockCompanies(term);
  const payload = await request<Company>(`/companies?q=${encodeURIComponent(term)}`);
  return fromPaginated(payload, filterMockCompanies(term));
}

/** Empresas de uma categoria, identificada pelo slug (ex.: `farmacia`). */
export async function getCompaniesByCategory(slug: string): Promise<Company[]> {
  if (!BASE_URL) return filterMockCompaniesByCategory(slug);
  const payload = await request<Company>(`/companies?category=${encodeURIComponent(slug)}`);
  return fromPaginated(payload, filterMockCompaniesByCategory(slug));
}

export async function searchCategories(query: string): Promise<Category[]> {
  const term = query.trim().toLowerCase();
  if (!BASE_URL) return filterMockCategories(term);
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
