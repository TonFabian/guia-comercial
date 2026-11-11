import { useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';

import type {
  Banner,
  Category,
  City,
  Company,
  Coupon,
  Job,
  Notice,
  Paginated,
  PublicUtility,
  PublicUtilityCategory,
  TourEvent,
  TourEventCategory,
  TouristSpot,
  TouristSpotCategory,
  User,
} from '../types/domain';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/** Tamanho de página padrão das listagens do painel. */
const DEFAULT_PAGE_SIZE = 50;

let authTokenProvider: (() => Promise<string | null>) | null = null;

/**
 * Provider do token de sessão Clerk. O token de sessão do Clerk dura ~60s:
 * cachear uma string fixa faz PUTs posteriores saírem com token expirado
 * (401 "Não autenticado"). O provider é consultado a cada request, e o
 * `getToken()` do Clerk devolve sempre o token válido/renovado.
 */
export function setTokenProvider(provider: (() => Promise<string | null>) | null) {
  authTokenProvider = provider;
}

/** Erro lançado para respostas non-2xx da API. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((init?.headers as Record<string, string>) ?? {}) };
  if (authTokenProvider) {
    const token = await authTokenProvider();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ApiError(
      response.status,
      `Erro na API (${response.status} ${response.statusText})${body ? `: ${extractErrorMessage(body)}` : ''}`,
    );
  }

  // 204 (DELETE) e respostas sem corpo não devem ser parseados como JSON.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Extrai uma mensagem legível do corpo de erro da API.
 *
 * O backend responde `{ error, details }` e o zod devolve `details.fieldErrors`
 * com uma lista por campo — mostrar o JSON cru na tela não ajuda ninguém, e
 * o campo inválido é mais útil que a mensagem genérica ("Payload inválido").
 */
function extractErrorMessage(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const details = record.details;
      if (details && typeof details === 'object') {
        const fieldErrors = (details as Record<string, unknown>).fieldErrors;
        if (fieldErrors && typeof fieldErrors === 'object') {
          const messages = Object.entries(fieldErrors as Record<string, unknown>)
            .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(' ') : String(value)}`)
            .slice(0, 3);
          if (messages.length > 0) return messages.join(' | ');
        }
      }
      if (typeof record.error === 'string' && record.error.length > 0) return record.error;
      if (typeof record.message === 'string' && record.message.length > 0) return record.message;
    }
  } catch {
    // Corpo não é JSON: devolve o texto bruto (limitado) abaixo.
  }
  return body.slice(0, 300);
}


export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

/**
 * Espelho local do usuário autenticado (GET /me). A role vem do backend —
 * fonte da verdade para o gate de acesso do painel —, não do metadata do Clerk.
 */
export async function getMe(): Promise<User | null> {
  try {
    return await request<User>('/me');
  } catch {
    return null;
  }
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/** Campos aceitos na criação/edição de uma empresa. `city` é o slug da cidade. */
export interface CompanyInput {
  name: string;
  slug: string;
  description: string;
  category: string;
  city?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  promotion?: string;
  plan?: 'free' | 'basic' | 'premium';
  schedule?: { day: number; opens: number; closes: number }[];
}

export type UpdateCompanyInput = Partial<CompanyInput>;

export interface CategoryInput {
  name: string;
  slug: string;
  icon?: string;
  order?: number;
}

export type UpdateCategoryInput = Partial<CategoryInput>;

export interface BannerInput {
  title: string;
  subtitle?: string;
  image?: string;
  link?: string;
  order?: number;
  active?: boolean;
}

export type UpdateBannerInput = Partial<BannerInput>;

export interface CouponInput {
  title: string;
  company: string;
  code: string;
  discount?: string;
  description?: string;
  expiresAt?: string;
}

export type UpdateCouponInput = Partial<CouponInput>;

export interface JobInput {
  title: string;
  company: string;
  description?: string;
  location?: string;
  type?: string;
}

export type UpdateJobInput = Partial<JobInput>;

export type NoticeType = Notice['type'];

export interface NoticeInput {
  title: string;
  body: string;
  type?: NoticeType;
  startsAt?: string;
  expiresAt?: string;
  active?: boolean;
}

export type UpdateNoticeInput = Partial<NoticeInput>;

export interface CityInput {
  name: string;
  slug: string;
  state: string;
}

/** Campos aceitos na criação/edição de um serviço de utilidade pública. */
export interface PublicUtilityInput {
  name: string;
  description: string;
  category: PublicUtilityCategory;
  /** `null` limpa o telefone já salvo. */
  phone?: string | null;
  details?: string[];
  /** `null` limpa o ícone já salvo. */
  icon?: string | null;
  /** Slug da cidade (mesma convenção usada pela API de empresas). `null` limpa. */
  city?: string | null;
  order?: number;
  active?: boolean;
}

export type UpdatePublicUtilityInput = Partial<PublicUtilityInput>;

/** Campos aceitos na criação/edição de um ponto turístico. `city` é o slug da cidade. */
export interface TouristSpotInput {
  name: string;
  slug: string;
  description: string;
  category: TouristSpotCategory;
  photos?: string[];
  /** `null` limpa o endereço já salvo. */
  address?: string | null;
  /** Slug da cidade (mesma convenção usada pela API de empresas). `null` = todas. */
  city?: string | null;
  latitude?: number;
  longitude?: number;

  entryFee?: 'free' | 'paid' | 'donation';
  /** Texto livre ("R$ 10,00"); obrigatório quando `entryFee` é "paid". */
  entryPrice?: string;
  /** `null` limpa o telefone já salvo. */
  phone?: string | null;
  /** `null` limpa o WhatsApp já salvo. */
  whatsapp?: string | null;
  website?: string;
  instagram?: string;
  featured?: boolean;
  active: boolean;
  order?: number;
  /** Empresa relacionada, por id ou slug. `null` limpa. */
  relatedCompany?: string | null;
}

export type UpdateTouristSpotInput = Partial<TouristSpotInput>;

/**
 * Item da programação interna do evento no payload.
 *
 * `relatedSpot` é id ou slug do atrativo (o backend resolve no service,
 * como faz com `organizerCompany`).
 */
export interface TourEventScheduleItemInput {
  /** Data do item, formato YYYY-MM-DD, dentro de [startDate, endDate]. */
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  description?: string;
  stage?: string;
  relatedSpot?: string;
  ticket?: 'free' | 'paid';
  ticketPrice?: string;
  ticketUrl?: string;
}

/** Campos aceitos na criação/edição de um evento turístico. `city` é o slug da cidade. */
export interface TourEventInput {
  name: string;
  slug: string;
  description: string;
  category: TourEventCategory;
  /** Data de início, formato YYYY-MM-DD (SEM hora). */
  startDate: string;
  /** Data de fim (>= `startDate`), formato YYYY-MM-DD (SEM hora). */
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  /** `null` limpa o endereço já salvo. */
  address?: string | null;
  /** Slug da cidade (mesma convenção usada pela API de empresas). `null` = todas. */
  city?: string | null;
  latitude?: number;
  longitude?: number;
  organizer?: string;
  /** Empresa organizadora, por id ou slug. `null` limpa. */
  organizerCompany?: string | null;
  ticket?: 'free' | 'paid';
  /** Texto livre ("R$ 40,00"); obrigatório quando `ticket` é "paid". */
  ticketPrice?: string;
  ticketUrl?: string;
  photos?: string[];
  /** Programação interna do evento (itens embutidos, sem coleção própria). */
  schedule?: TourEventScheduleItemInput[];
  /** `null` limpa o telefone já salvo. */
  phone?: string | null;
  /** `null` limpa o WhatsApp já salvo. */
  whatsapp?: string | null;
  website?: string;
  instagram?: string;
  featured?: boolean;
  active: boolean;
}

export type UpdateTourEventInput = Partial<TourEventInput>;

/**
 * Item devolvido por `GET /users`.
 *
 * O backend monta o nome (`firstName` + `lastName`) e omite `pushToken` e os
 * identificadores de sessão — por isso o tipo deriva de `User`.
 */
export interface AdminUserListItem extends Pick<User, '_id' | 'email' | 'role' | 'city' | 'createdAt'> {
  /** Nome já montado pelo backend. */
  name?: string;
  /** true quando o item é a conta do admin que fez a requisição. */
  isSelf?: boolean;
}

// ---------------------------------------------------------------------------
// Listagens
// ---------------------------------------------------------------------------

function paginationQuery(page: number, pageSize: number): string {
  return new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
}

export async function getCompanies(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<Company>> {
  return request<Paginated<Company>>(`/companies?${paginationQuery(page, pageSize)}`);
}

export async function getCategories(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<Category>> {
  return request<Paginated<Category>>(`/categories?${paginationQuery(page, pageSize)}`);
}

export async function getBanners(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<Banner>> {
  return request<Paginated<Banner>>(`/banners?${paginationQuery(page, pageSize)}`);
}

export async function getCoupons(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<Coupon>> {
  return request<Paginated<Coupon>>(`/coupons?${paginationQuery(page, pageSize)}`);
}

export async function getJobs(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<Job>> {
  return request<Paginated<Job>>(`/jobs?${paginationQuery(page, pageSize)}`);
}

/**
 * Avisos do guia, para gerenciar no painel.
 *
 * O painel vê também rascunhos e avisos vencidos (para editar, publicar e
 * desativar). O default do backend agora é fail-closed — sem `active` ele
 * devolve só avisos ativos e vigentes, e apenas `active=all` (admin) devolve
 * a lista completa.
 */
export async function getNotices(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<Notice>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    active: 'all',
  });
  return request<Paginated<Notice>>(`/notices?${params.toString()}`);
}

/** Usuários do app (admin-only no backend). Somente leitura no painel. */
export async function getUsers(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<AdminUserListItem>> {
  return request<Paginated<AdminUserListItem>>(`/users?${paginationQuery(page, pageSize)}`);
}

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<AdminUserListItem> {
  return apiPut<AdminUserListItem>(`/users/${id}/role`, { role });
}

export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  /** Slug da cidade; `null` limpa (usuário sem cidade definida). */
  city?: string | null;
}

export async function updateUserProfile(id: string, body: UpdateUserProfileInput): Promise<AdminUserListItem> {
  return apiPut<AdminUserListItem>(`/users/${id}`, body);
}

export async function deleteUser(id: string): Promise<void> {
  await apiDelete<void>(`/users/${id}`);
}

export async function getPublicUtilities(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<PublicUtility>> {
  return request<Paginated<PublicUtility>>(`/public-utilities?${paginationQuery(page, pageSize)}`);
}

export async function getTouristSpots(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<TouristSpot>> {
  return request<Paginated<TouristSpot>>(`/tourist-spots?${paginationQuery(page, pageSize)}`);
}

/**
 * Eventos turísticos.
 *
 * O painel precisa enxergar também os eventos já encerrados (para editar e
 * desativar): sem `includePast=true` o backend esconde os vencidos.
 */
export async function getEvents(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<TourEvent>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    includePast: 'true',
  });
  return request<Paginated<TourEvent>>(`/events?${params.toString()}`);
}

/**
 * Cidades do guia.
 *
 * A rota `/cities` responde uma lista pura (sem paginação). O narrowing aceita
 * também o formato paginado para não quebrar caso o backend mude o contrato.
 */
export async function getCities(): Promise<City[]> {
  const payload = await request<City[] | Paginated<City>>('/cities');
  if (Array.isArray(payload)) return payload;
  return payload.items;
}

// ---------------------------------------------------------------------------
// Mutações
// ---------------------------------------------------------------------------

export async function createCompany(body: CompanyInput): Promise<Company> {
  return apiPost<Company>('/companies', body);
}

export async function updateCompany(id: string, body: UpdateCompanyInput): Promise<Company> {
  // O plano NUNCA vai na edição de dados: só admin muda, pela rota dedicada
  // updateCompanyPlan. O backend também descarta o campo — aqui garantimos
  // que o cliente nem o envie (ex.: spread acidental de um Company).
  const dadosSemPlano: UpdateCompanyInput = { ...body };
  delete dadosSemPlano.plan;
  return apiPut<Company>(`/companies/${id}`, dadosSemPlano);
}

export async function updateCompanyPlan(id: string, plan: 'free' | 'basic' | 'premium'): Promise<Company> {
  return apiPut<Company>(`/companies/${id}/plan`, { plan });
}

export async function deleteCompany(id: string): Promise<void> {
  await apiDelete<void>(`/companies/${id}`);
}

export async function createCategory(body: CategoryInput): Promise<Category> {
  return apiPost<Category>('/categories', body);
}

export async function updateCategory(id: string, body: UpdateCategoryInput): Promise<Category> {
  return apiPut<Category>(`/categories/${id}`, body);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiDelete<void>(`/categories/${id}`);
}

export async function createBanner(body: BannerInput): Promise<Banner> {
  return apiPost<Banner>('/banners', body);
}

export async function updateBanner(id: string, body: UpdateBannerInput): Promise<Banner> {
  return apiPut<Banner>(`/banners/${id}`, body);
}

export async function deleteBanner(id: string): Promise<void> {
  await apiDelete<void>(`/banners/${id}`);
}

export async function createCoupon(body: CouponInput): Promise<Coupon> {
  return apiPost<Coupon>('/coupons', body);
}

export async function updateCoupon(id: string, body: UpdateCouponInput): Promise<Coupon> {
  return apiPut<Coupon>(`/coupons/${id}`, body);
}

export async function deleteCoupon(id: string): Promise<void> {
  await apiDelete<void>(`/coupons/${id}`);
}

export async function createJob(body: JobInput): Promise<Job> {
  return apiPost<Job>('/jobs', body);
}

export async function updateJob(id: string, body: UpdateJobInput): Promise<Job> {
  return apiPut<Job>(`/jobs/${id}`, body);
}

export async function deleteJob(id: string): Promise<void> {
  await apiDelete<void>(`/jobs/${id}`);
}

export async function createNotice(body: NoticeInput): Promise<Notice> {
  return apiPost<Notice>('/notices', body);
}

export async function updateNotice(id: string, body: UpdateNoticeInput): Promise<Notice> {
  return apiPut<Notice>(`/notices/${id}`, body);
}

export async function deleteNotice(id: string): Promise<void> {
  await apiDelete<void>(`/notices/${id}`);
}

/**
 * Cidades: o backend expõe apenas criação e exclusão (não há `PUT /cities/:id`),
 * por isso o painel não oferece edição para este recurso.
 */
export async function createCity(body: CityInput): Promise<City> {
  return apiPost<City>('/cities', body);
}

export async function deleteCity(id: string): Promise<void> {
  await apiDelete<void>(`/cities/${id}`);
}

export async function createPublicUtility(body: PublicUtilityInput): Promise<PublicUtility> {
  return apiPost<PublicUtility>('/public-utilities', body);
}

export async function updatePublicUtility(id: string, body: UpdatePublicUtilityInput): Promise<PublicUtility> {
  return apiPut<PublicUtility>(`/public-utilities/${id}`, body);
}

export async function deletePublicUtility(id: string): Promise<void> {
  await apiDelete<void>(`/public-utilities/${id}`);
}

export async function createTouristSpot(body: TouristSpotInput): Promise<TouristSpot> {
  return apiPost<TouristSpot>('/tourist-spots', body);
}

export async function updateTouristSpot(id: string, body: UpdateTouristSpotInput): Promise<TouristSpot> {
  return apiPut<TouristSpot>(`/tourist-spots/${id}`, body);
}

export async function deleteTouristSpot(id: string): Promise<void> {
  await apiDelete<void>(`/tourist-spots/${id}`);
}

export async function createEvent(body: TourEventInput): Promise<TourEvent> {
  return apiPost<TourEvent>('/events', body);
}

export async function updateEvent(id: string, body: UpdateTourEventInput): Promise<TourEvent> {
  return apiPut<TourEvent>(`/events/${id}`, body);
}

export async function deleteEvent(id: string): Promise<void> {
  await apiDelete<void>(`/events/${id}`);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Hook mínimo de fetching (sem dependências externas).
 *
 * O `fetcher` é guardado em uma ref para que a busca rode apenas quando os
 * `deps` mudam: passar uma arrow function inline não deve causar loop de
 * refetch (dependência instável em `useEffect`).
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: DependencyList = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, error, loading };
}
