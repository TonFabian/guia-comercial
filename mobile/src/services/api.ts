/**
 * Cliente tipado para a API do guia (somente chamadas de domínio — use estas
 * funções, nunca `fetch` direto nos componentes).
 *
 * O transporte mora em src/services/http.ts: lá ficam a base URL, o header de
 * sessão do Clerk e o comportamento de fallback (mock quando a env não está
 * definida ou a API está fora do ar; 401/403 reais estouram `ApiError`).
 */
import type { AutonomousProfessional, Banner, Category, City, Company, Coupon, Job, Notice, Paginated, PublicUtility, Review, TourEvent, TouristSpot, User } from '@/types/domain';
import { buildTourismQuery } from '@/features/tourism/tourism-query';
import type { TourismQueryParams } from '@/features/tourism/tourism-query';

import { ApiError, isApiConfigured, request } from './http';
import type { RequestPayload } from './http';

import {
  MOCK_BANNERS,
  MOCK_CATEGORIES,
  MOCK_COUPONS,
  MOCK_COMPANIES,
  MOCK_EVENTS,
  MOCK_FEATURED_COMPANY,
  MOCK_JOBS,
  MOCK_PHARMACY,
  MOCK_TOURIST_SPOTS,
} from '@/data/mock';
import { MOCK_PUBLIC_UTILITIES } from '@/data/public-utilities';


/** Mocks só em desenvolvimento: em produção, falha de rede/API vira lista vazia. */
function mockFallback<T>(mock: T[]): T[] {
  return __DEV__ ? mock : [];
}

/**
 * Teto do texto de busca no backend (`lerTexto` em backend/src/utils/query.ts,
 * limite padrão de 120): acima dele a busca responde 400. O cliente trunca o
 * termo para a tela de busca nunca disparar o 400 com texto copiado/colado
 * longo — o backend ancora o teto, o app nunca o excede.
 */
export const LIMITE_DE_TERMO_DE_BUSCA = 120;

/** Aparado e truncado ao teto que o backend aceita na query textual. */
export function truncarTermoDeBusca(termo: string): string {
  const aparado = termo.trim();
  return aparado.length > LIMITE_DE_TERMO_DE_BUSCA
    ? aparado.slice(0, LIMITE_DE_TERMO_DE_BUSCA)
    : aparado;
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

export async function getCompanies(page = 1, pageSize = 20, city?: string, featured?: boolean): Promise<CompanyPage> {
  if (!isApiConfigured()) {
    if (!__DEV__) return { items: [], total: 0, page, pageSize };
    let items = MOCK_COMPANIES;
    if (city) {
      const target = normalizeCity(city);
      items = items.filter((c) => normalizeCity(c.city) === target);
    }
    if (featured !== undefined) {
      items = items.filter((c) => Boolean(c.isFeatured) === featured);
    }
    const start = (page - 1) * pageSize;
    const sliced = items.slice(start, start + pageSize);
    return { items: sliced, total: items.length, page, pageSize };
  }
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (city) params.set('city', city);
  if (featured !== undefined) params.set('featured', String(featured));
  const payload = await request<Company>(`/companies?${params.toString()}`);
  const items = fromPaginated(payload, []);
  const total = isPaginated(payload) ? (payload.total ?? items.length) : items.length;
  const allowMockFallback = __DEV__;
  const fallbackItems = page === 1 && items.length === 0 && allowMockFallback ? MOCK_COMPANIES.slice(0, pageSize) : items;
  const fallbackTotal = page === 1 && items.length === 0 && allowMockFallback ? MOCK_COMPANIES.length : total;
  return { items: fallbackItems, total: fallbackTotal, page, pageSize };
}

/**
 * Empresas cujo dono é o `ownerClerkId` informado.
 *
 * `null` quando a consulta não pôde ser feita — a UI distingue "sem empresa"
 * (lista vazia) de "não sei" (falha), para não rotular o usuário errado.
 */
export async function getOwnedCompanies(ownerClerkId: string): Promise<Company[] | null> {
  if (!ownerClerkId) return null;

  if (!isApiConfigured()) {
    return __DEV__ ? MOCK_COMPANIES.filter((c) => c.ownerClerkId === ownerClerkId) : null;
  }

  try {
    const params = new URLSearchParams({ owner: ownerClerkId, page: '1', pageSize: '1' });
    const payload = await request<Company>(`/companies?${params.toString()}`);
    if (!payload) return null;
    return fromPaginated(payload, []);
  } catch {
    return null;
  }
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

/** Parâmetros aceitos pela busca de empresas. */
export type CompanySearchParams = {
  /** Texto digitado pelo usuário. */
  q?: string;
  /** Slugs das categorias (o backend aceita várias, separadas por vírgula). */
  categories?: string[];
  page?: number;
  pageSize?: number;
};

export async function searchCompanies(params: CompanySearchParams = {}): Promise<CompanyPage> {
  // Trunca depois do lowercase: o lowercase pode expandir o texto (ex.: 'İ').
  const term = truncarTermoDeBusca((params.q ?? '').trim().toLowerCase());
  const categories = params.categories ?? [];
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  if (!isApiConfigured()) {
    const filtered = filterMockCompanies(term, categories);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, total: filtered.length, page, pageSize };
  }

  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (term) search.set('q', term);
  if (categories.length > 0) search.set('category', categories.join(','));

  const payload = await request<Company>(`/companies?${search.toString()}`);
  const items = fromPaginated(payload, []);
  const total = isPaginated(payload) ? (payload.total ?? items.length) : items.length;
  const fallback = __DEV__ ? filterMockCompanies(term, categories) : [];
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
    await request('/push-tokens', { method: 'POST', body: { token: pushToken } });
  } catch {
    // Registro de push token não deve quebrar o app.
  }
}
export async function getAutonomousProfessionals(): Promise<AutonomousProfessional[]> {
  if (!isApiConfigured()) return [];
  try {
    const payload = await request<AutonomousProfessional>('/autonomous-professionals');
    if (!payload) return [];
    // A API responde no formato paginado ({ items, total, ... }).
    if (Array.isArray(payload)) return payload;
    const paginated = payload as unknown as Paginated<AutonomousProfessional>;
    if (paginated.items) return paginated.items;
    return [payload as AutonomousProfessional];
  } catch {
    return [];
  }
}

export async function getNotices(): Promise<Notice[]> {
  if (!isApiConfigured()) return [];
  try {
    const payload = await request<Notice>('/notices?active=true');
    if (!payload) return [];
    return fromPaginated(payload, []);
  } catch {
    return [];
  }
}

/**
 * Serviços de utilidade pública ativos (polícia, hospital, coleta...).
 *
 * Sem backend configurado (ou fora do ar) o app usa os dados locais de
 * exemplo; em produção com a API configurada, uma falha vira erro para a
 * tela mostrar — nunca uma lista inventada.
 */
export async function getPublicUtilities(): Promise<PublicUtility[]> {
  if (!isApiConfigured()) {
    return __DEV__ ? MOCK_PUBLIC_UTILITIES : [];
  }

  const payload = await request<PublicUtility>('/public-utilities?active=true');
  if (!payload) {
    if (__DEV__) return MOCK_PUBLIC_UTILITIES;
    throw new Error('Não foi possível carregar os telefones úteis.');
  }

  return fromPaginated(payload, []);
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

/** Parâmetros aceitos pela listagem de pontos turísticos e eventos. */
export type TourismParams = TourismQueryParams;

/** Página de turismo devolvida pelo backend (`total` permite paginar). */
export type TourismPage<T> = { items: T[]; total: number };

/** Pontos turísticos ativos (parque, cachoeira, mirante...). */
export async function getTouristSpots(params: TourismParams = {}): Promise<TourismPage<TouristSpot>> {
  if (!isApiConfigured()) {
    const items = mockFallback(MOCK_TOURIST_SPOTS);
    return { items, total: items.length };
  }
  const query = buildTourismQuery({ ...params, q: truncarTermoDeBusca(params.q ?? '') });
  const payload = await request<TouristSpot>(`/tourist-spots${query}`);
  const items = fromPaginated(payload, mockFallback(MOCK_TOURIST_SPOTS));
  const total = isPaginated(payload) ? (payload.total ?? items.length) : items.length;
  return { items, total };
}

/** Eventos turísticos (festival, feira, show...). */
export async function getEvents(params: TourismParams = {}): Promise<TourismPage<TourEvent>> {
  if (!isApiConfigured()) {
    const items = mockFallback(MOCK_EVENTS);
    return { items, total: items.length };
  }
  const query = buildTourismQuery({ ...params, q: truncarTermoDeBusca(params.q ?? '') });
  const payload = await request<TourEvent>(`/events${query}`);
  const items = fromPaginated(payload, mockFallback(MOCK_EVENTS));
  const total = isPaginated(payload) ? (payload.total ?? items.length) : items.length;
  return { items, total };
}

/** Atração turística mockada por `_id` ou `slug` (fallback quando a API está fora do ar). */
export function findMockTouristSpot(id: string): TouristSpot | null {
  return MOCK_TOURIST_SPOTS.find((spot) => spot._id === id || spot.slug === id) ?? null;
}

/** Evento turístico mockado por `_id` ou `slug` (fallback quando a API está fora do ar). */
export function findMockEvent(id: string): TourEvent | null {
  return MOCK_EVENTS.find((event) => event._id === id || event.slug === id) ?? null;
}

/**
 * Ponto turístico pelo id (o backend não resolve slug — só o fallback mock
 * aceita slug). `null` quando a API responde que não existe.
 */
export async function getTouristSpotById(id: string): Promise<TouristSpot | null> {
  if (!isApiConfigured()) return __DEV__ ? findMockTouristSpot(id) : null;
  try {
    const payload = await request<TouristSpot>(`/tourist-spots/${encodeURIComponent(id)}`);
    if (!payload) return __DEV__ ? findMockTouristSpot(id) : null;
    const [spot] = fromPaginated(payload, []);
    return spot ?? (__DEV__ ? findMockTouristSpot(id) : null);
  } catch {
    return __DEV__ ? findMockTouristSpot(id) : null;
  }
}

/**
 * Evento turístico pelo id (o backend não resolve slug — só o fallback mock
 * aceita slug). `null` quando a API responde que não existe — evento VENCIDO
 * continua sendo recurso válido (200): quem decide como mostrar o "Encerrado"
 * é a tela.
 */
export async function getEventById(id: string): Promise<TourEvent | null> {
  if (!isApiConfigured()) return __DEV__ ? findMockEvent(id) : null;
  try {
    const payload = await request<TourEvent>(`/events/${encodeURIComponent(id)}`);
    if (!payload) return __DEV__ ? findMockEvent(id) : null;
    const [event] = fromPaginated(payload, []);
    return event ?? (__DEV__ ? findMockEvent(id) : null);
  } catch {
    return __DEV__ ? findMockEvent(id) : null;
  }
}


export async function updateCompany(id: string, body: Partial<Company>): Promise<Company | null> {
  if (!isApiConfigured()) return null;
  const payload = await request<Company>(`/companies/${encodeURIComponent(id)}`, { method: 'PUT', body });
  if (!payload) return null;
  return Array.isArray(payload) ? (payload[0] ?? null) : (payload as Company);
}

export interface CompanyAnalyticsSummary {
  companyId: string;
  from: string;
  to: string;
  views: number;
  whatsappClicks: number;
}

/**
 * Resumo de engajamento da empresa (feature Premium). Retorna null quando a
 * API não está configurada (mock) ou o plano não dá acesso (403) — o card
 * simplesmente não aparece, sem erro para o lojista free/basic.
 */
export async function getCompanyAnalytics(id: string): Promise<CompanyAnalyticsSummary | null> {
  if (!isApiConfigured()) return null;
  try {
    const payload = await request<CompanyAnalyticsSummary>(`/companies/${encodeURIComponent(id)}/analytics`);
    if (!payload || Array.isArray(payload) || !('views' in payload)) return null;
    return payload;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return null;
    throw error;
  }
}

/** Filtra as empresas mockadas pelo termo e pelas categorias (slug ou id). */
export function filterMockCompanies(term: string, categories: string[] = []): Company[] {
  const byTerm = term
    ? MOCK_COMPANIES.filter((company) => company.name.toLowerCase().includes(term))
    : MOCK_COMPANIES;

  if (categories.length === 0) return byTerm;

  const categoryIds = new Set(
    MOCK_CATEGORIES.filter(
      (category) => categories.includes(category.slug) || categories.includes(category._id),
    ).map((category) => category._id),
  );

  return byTerm.filter((company) => {
    const reference = company.category;
    const id = typeof reference === 'string' ? reference : reference._id;
    return categoryIds.has(id);
  });
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
