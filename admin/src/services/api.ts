import { useEffect, useRef, useState } from 'react';

import type { AdminUser, Banner, Category, Company, Coupon, Job, Paginated } from '../types/domain';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

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
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ApiError(
      response.status,
      `Erro na API (${response.status} ${response.statusText})${body ? `: ${body}` : ''}`,
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

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Endpoints (scaffold — ainda não implementados). Impl apartir daqui quando as
// telas de CRUD forem construídas. Cada função lança erro explícito para não
// fingir que funciona.
// ---------------------------------------------------------------------------

export async function getCompanies(page = 1): Promise<Paginated<Company>> {
  return request<Paginated<Company>>(`/companies?page=${page}`);
}

export async function getCategories(): Promise<Paginated<Category>> {
  return request<Paginated<Category>>('/categories');
}

export async function getBanners(): Promise<Paginated<Banner>> {
  return request<Paginated<Banner>>('/banners');
}

export async function getCoupons(): Promise<Paginated<Coupon>> {
  return request<Paginated<Coupon>>('/coupons');
}

export async function getJobs(): Promise<Paginated<Job>> {
  return request<Paginated<Job>>('/jobs');
}

export async function getUsers(): Promise<Paginated<AdminUser>> {
  return request<Paginated<AdminUser>>('/users');
}

export async function createCompany(body: Partial<Company>): Promise<Company> {
  return apiPost<Company>('/companies', body);
}

export async function updateCompany(id: string, body: Partial<Company>): Promise<Company> {
  return apiPut<Company>(`/companies/${id}`, body);
}

export async function deleteCompany(id: string): Promise<void> {
  await apiDelete<void>(`/companies/${id}`);
}

export interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Hook mínimo de fetching (sem dependências externas).
 *
 * O `fetcher` é guardado em uma ref para que a busca rode apenas na montagem
 * do componente: passar uma arrow function inline não deve causar loop de
 * refetch (dependência instável em `useEffect`).
 */
export function useApi<T>(fetcher: () => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;

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
  }, []);

  return { data, error, loading };
}
