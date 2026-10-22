/**
 * Fachada HTTP da API com suporte a sessão do Clerk.
 *
 * `api.ts` (domínio) chama desta camada; componentes nunca fazem fetch.
 * Sem `EXPO_PUBLIC_API_URL` ou com a rede fora do ar, o resultado é `null`
 * e quem chamou usa os mocks — como sempre. Já um 401/403 real do backend
 * lança `ApiError`: dado "parecido mas mockado" seria mentir para o
 * usuário autenticado (com sessão válida ou expirada).
 */
import type { Paginated } from '@/types/domain';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Requisição falhou com status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Devolve o token de sessão atual ou `null` (convidado / sem Clerk). */
export type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

/**
 * Injetado pelo AuthProvider na montagem (o `getToken` real vem do Clerk).
 * A inversão evita dependência cíclica com a camada de autenticação.
 */
export function registerTokenGetter(getter: TokenGetter | null): void {
  tokenGetter = getter;
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/** Indica se a API real está configurada (modos mock pulam o fetch). */
export function isApiConfigured(): boolean {
  return Boolean(BASE_URL);
}

interface RequestInitLite {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function currentToken(): Promise<string | null> {
  if (!tokenGetter) {
    return null;
  }

  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}

async function readErrorBody(response: Response): Promise<unknown> {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function request<T>(
  path: string,
  init?: RequestInitLite,
): Promise<Paginated<T> | T[] | null> {
  if (!BASE_URL) {
    return null;
  }

  const token = await currentToken();

  try {
    let response = await fetch(`${BASE_URL}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init?.signal,
    });

    // Token pode expirar entre sessões: um retry com token renovado antes
    // de reportar o 401 a quem chamou.
    if (response.status === 401 && token) {
      const renewed = await currentToken();

      if (renewed && renewed !== token) {
        response = await fetch(`${BASE_URL}${path}`, {
          method: init?.method ?? 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${renewed}`,
          },
          body: init?.body === undefined ? undefined : JSON.stringify(init.body),
          signal: init?.signal,
        });
      }
    }

    if (response.status === 401 || response.status === 403) {
      throw new ApiError(response.status, await readErrorBody(response));
    }

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Paginated<T> | T[];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Rede fora do ar / JSON inválido → mock, como hoje.
    return null;
  }
}
