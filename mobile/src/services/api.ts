/**
 * Cliente tipado para a API do guia (somente chamadas de domínio — use estas
 * funções, nunca `fetch` direto nos componentes).
 *
 * O transporte mora em src/services/http.ts: lá ficam a base URL, o header de
 * sessão do Clerk e o comportamento de fallback (mock quando a env não está
 * definida ou a API está fora do ar; 401/403 reais estouram `ApiError`).
 */
import type { AutonomousProfessional, Banner, Category, City, Company, Coupon, Job, Notice, Paginated, Review, User } from '@/types/domain';

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


/** Mocks só em desenvolvimento: em produção, falha de rede/API vira lista vazia. */
function mockFallback<T>(mock: T[]): T[] {
  return (__DEV__ || !isApiConfigured()) ? mock : [];
}

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
  return fromPaginated(payload, mockFallback(MOCK_CATEGORIES));
}

export async function getBanners(): Promise<Banner[]> {
  const payload = await request<Banner>('/banners');
  return fromPaginated(payload, mockFallback(MOCK_BANNERS));
}

export type CompanyPage = {
  items: Company[];
  total: number;
  page: number;
  pageSize: number;
};

function normalizeCity(value: string | { name?: string } | null | undefined): string {
  const name = typeof value === 'string' ? value : (value?.name ?? '');
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export async function getCompanies(page = 1, pageSize = 20, city?: string): Promise<CompanyPage> {
  if (!isApiConfigured()) {
    if (!__DEV__) return { items: [], total: 0, page, pageSize };
    let items = MOCK_COMPANIES;
    if (city) {
      const target = normalizeCity(city);
      items = items.filter((c) => normalizeCity(c.city) === target);
    }
    const start = (page - 1) * pageSize;
    const sliced = items.slice(start, start + pageSize);
    return { items: sliced, total: items.length, page, pageSize };
  }
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (city) params.set('city', city);
  const payload = await request<Company>(`/companies?${params.toString()}`);
  const items = fromPaginated(payload, []);
  const total = isPaginated(payload) ? (payload.total ?? items.length) : items.length;
  const allowMockFallback = __DEV__ || !isApiConfigured();
  const fallbackItems = page === 1 && items.length === 0 && allowMockFallback ? MOCK_COMPANIES.slice(0, pageSize) : items;
  const fallbackTotal = page === 1 && items.length === 0 && allowMockFallback ? MOCK_COMPANIES.length : total;
  return { items: fallbackItems, total: fallbackTotal, page, pageSize };
}

export async function getCoupons(): Promise<Coupon[]> {
  const payload = await request<Coupon>('/coupons');
  return fromPaginated(payload, mockFallback(MOCK_COUPONS));
}

/** Empresa pelo id. `null` quando a API responde que não existe. */
export async function getCompanyById(id: string): Promise<Company | null> {
  if (!isApiConfigured()) return __DEV__ ? findMockCompany(id) : null;
  try {
    const payload = await request<Company>(`/companies/${encodeURIComponent(id)}`);
    if (!payload) return __DEV__ ? findMockCompany(id) : null;
    const [company] = fromPaginated(payload, []);
    return company ?? (__DEV__ ? findMockCompany(id) : null);
  } catch {
    return __DEV__ ? findMockCompany(id) : null;
  }
}

/** Cupons de uma empresa específica. */
export async function getCouponsByCompany(companyId: string): Promise<Coupon[]> {
  const payload = await request<Coupon>(`/coupons?company=${encodeURIComponent(companyId)}`);
  if (payload) return fromPaginated(payload, []);
  return __DEV__ ? filterMockCouponsByCompany(companyId) : [];
}

export async function getJobs(): Promise<Job[]> {
  const payload = await request<Job>('/jobs');
  return fromPaginated(payload, mockFallback(MOCK_JOBS));
}

/** Vaga pelo id. `null` quando a API responde que não existe. */
export async function getJobById(id: string): Promise<Job | null> {
  if (!isApiConfigured()) return __DEV__ ? findMockJob(id) : null;
  try {
    const payload = await request<Job>(`/jobs/${encodeURIComponent(id)}`);
    if (!payload) return __DEV__ ? findMockJob(id) : null;
    const [job] = fromPaginated(payload, []);
    return job ?? (__DEV__ ? findMockJob(id) : null);
  } catch {
    return __DEV__ ? findMockJob(id) : null;
  }
}

export async function getFeaturedCompany(city?: string): Promise<Company | null> {
  if (!isApiConfigured()) return __DEV__ ? MOCK_FEATURED_COMPANY : null;
  try {
    const params = new URLSearchParams({ featured: 'true' });
    if (city) params.set('city', city);
    const payload = await request<Company>(`/companies?${params.toString()}`);
    const items = fromPaginated(payload, mockFallback(MOCK_COMPANIES));
    const found = items.find((company) => company.isFeatured) ?? items[0] ?? null;
    return found ?? (__DEV__ ? MOCK_FEATURED_COMPANY : null);
  } catch {
    return __DEV__ ? MOCK_FEATURED_COMPANY : null;
  }
}

export async function getPharmacyOnDuty(city?: string): Promise<Company | null> {
  if (!isApiConfigured()) return __DEV__ ? MOCK_PHARMACY : null;
  try {
    const params = new URLSearchParams({ category: 'farmacia' });
    if (city) params.set('city', city);
    const payload = await request<Company>(`/companies?${params.toString()}`);
    const items = fromPaginated(payload, []);
    return items[0] ?? (__DEV__ ? MOCK_PHARMACY : null);
  } catch {
    return __DEV__ ? MOCK_PHARMACY : null;
  }
}

export async function searchCompanies(query: string, page = 1, pageSize = 20): Promise<CompanyPage> {
  const term = query.trim().toLowerCase();
  if (!isApiConfigured()) {
    const filtered = filterMockCompanies(term);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, total: filtered.length, page, pageSize };
  }
  const payload = await request<Company>(`/companies?q=${encodeURIComponent(term)}&page=${page}&pageSize=${pageSize}`);
  const items = fromPaginated(payload, []);
  const total = isPaginated(payload) ? (payload.total ?? items.length) : items.length;
  const fallback = (__DEV__ || !isApiConfigured()) ? filterMockCompanies(term) : [];
  const fallbackItems = page === 1 && items.length === 0 ? fallback.slice(0, pageSize) : items;
  const fallbackTotal = page === 1 && items.length === 0 ? fallback.length : total;
  return { items: fallbackItems, total: fallbackTotal, page, pageSize };
}

/** Empresas de uma categoria, identificada pelo slug (ex.: `farmacia`). */
export async function getCompaniesByCategory(slug: string, page = 1, pageSize = 20): Promise<CompanyPage> {
  if (!isApiConfigured()) {
    const filtered = filterMockCompaniesByCategory(slug);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, total: filtered.length, page, pageSize };
  }
  const payload = await request<Company>(`/companies?category=${encodeURIComponent(slug)}&page=${page}&pageSize=${pageSize}`);
  const items = fromPaginated(payload, []);
  const total = isPaginated(payload) ? (payload.total ?? items.length) : items.length;
  const fallback = (__DEV__ || !isApiConfigured()) ? filterMockCompaniesByCategory(slug) : [];
  const fallbackItems = page === 1 && items.length === 0 ? fallback.slice(0, pageSize) : items;
  const fallbackTotal = page === 1 && items.length === 0 ? fallback.length : total;
  return { items: fallbackItems, total: fallbackTotal, page, pageSize };
}

export async function searchCategories(query: string): Promise<Category[]> {
  const term = query.trim().toLowerCase();
  if (!isApiConfigured()) return filterMockCategories(term);
  const payload = await request<Category>(`/categories?q=${encodeURIComponent(term)}`);
  return fromPaginated(payload, filterMockCategories(term));
}

export async function getMe(): Promise<User | null> {
  if (!isApiConfigured()) return null;
  try {
    const payload = await request<User>('/me');
    if (!payload) return null;
    return Array.isArray(payload) ? (payload[0] ?? null) : (payload as User);
  } catch {
    return null;
  }
}

export async function updateMe(mirror: Partial<User>): Promise<User | null> {
  if (!isApiConfigured()) return null;
  try {
    const payload = await request<User>('/me', { method: 'PUT', body: mirror });
    if (!payload) return null;
    return Array.isArray(payload) ? (payload[0] ?? null) : (payload as User);
  } catch {
    return null;
  }
}

export async function getReviews(companyId: string): Promise<Review[]> {
  if (!isApiConfigured()) return [];
  try {
    const payload = await request<Review>(`/companies/${encodeURIComponent(companyId)}/reviews`);
    if (!payload) return [];
    return Array.isArray(payload) ? payload : [payload as Review];
  } catch {
    return [];
  }
}

export async function createReview(companyId: string, rating: number, comment?: string): Promise<Review | null> {
  if (!isApiConfigured()) return null;
  try {
    const payload = await request<Review>(`/companies/${encodeURIComponent(companyId)}/reviews`, {
      method: 'POST',
      body: { rating, comment },
    });
    if (!payload) return null;
    return Array.isArray(payload) ? (payload[0] ?? null) : (payload as Review);
  } catch {
    return null;
  }
}
export async function updatePushToken(pushToken: string): Promise<void> {
  if (!isApiConfigured()) return;
  try {
    await request('/me/push-token', { method: 'PUT', body: { pushToken } });
  } catch {
    // ignora
  }
}
export async function getAutonomousProfessionals(): Promise<AutonomousProfessional[]> {
  if (!isApiConfigured()) return [];
  try {
    const payload = await request<AutonomousProfessional>('/autonomous-professionals');
    if (!payload) return [];
    return Array.isArray(payload) ? payload : [payload as AutonomousProfessional];
  } catch {
    return [];
  }
}

export async function getNotices(): Promise<Notice[]> {
  if (!isApiConfigured()) return [];
  try {
    const payload = await request<Notice>('/notices?active=true');
    if (!payload) return [];
    return Array.isArray(payload) ? payload : [payload as Notice];
  } catch {
    return [];
  }
}

export async function getCities(): Promise<City[]> {
  if (!isApiConfigured()) return [];
  try {
    const payload = await request<City>('/cities');
    if (!payload) return [];
    return Array.isArray(payload) ? payload : [payload as City];
  } catch {
    return [];
  }
}

export async function updateCompany(id: string, body: Partial<Company>): Promise<Company | null> {
  if (!isApiConfigured()) return null;
  try {
    const payload = await request<Company>(`/companies/${encodeURIComponent(id)}`, { method: 'PUT', body });
    if (!payload) return null;
    return Array.isArray(payload) ? (payload[0] ?? null) : (payload as Company);
  } catch {
    return null;
  }
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

/** Vaga mockada pelo id (fallback quando a API está fora do ar). */
export function findMockJob(id: string): Job | null {
  return MOCK_JOBS.find((job) => job._id === id) ?? null;
}

/** Cupons mockados que pertencem a uma empresa. */
export function filterMockCouponsByCompany(companyId: string): Coupon[] {
  return MOCK_COUPONS.filter((coupon) => {
    const company = coupon.company;
    return typeof company !== 'string' && company._id === companyId;
  });
}
