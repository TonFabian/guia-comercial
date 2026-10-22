import type { ClerkClient, User as ClerkUser } from '@clerk/backend';
import { createClerkClient } from '@clerk/backend';
import type { Request, RequestHandler, Response } from 'express';

import {
  findUserByClerkId,
  touchSession,
  upsertUserFromMirror,
} from '../services/user.service.js';
import type { ClerkUserData } from '../utils/clerk-user.js';
import { mapClerkUserToMirror } from '../utils/clerk-user.js';

/** Cabeçalhos do request no formato esperado pela API do Clerk. */
export interface RequestState {
  requestHeaders: Headers;
}

/** Claims mínimas do session token usadas pela aplicação. */
export interface SessionIdentity {
  sub: string;
  sid?: string;
}

export type GetState = (
  requestState: RequestState,
) => Promise<SessionIdentity | null>;

export interface AuthDeps {
  getState: GetState;
  getUser: (clerkId: string) => Promise<ClerkUserData>;
  find: typeof findUserByClerkId;
  upsert: typeof upsertUserFromMirror;
  touch: typeof touchSession;
}

export interface AuthMiddleware {
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

/**
 * Monta os middlewares de autenticação com as dependências injetadas.
 *
 * A fábrica existe para que os testes substituam a verificação do Clerk e o
 * acesso ao banco sem rede nem Mongo; a montagem real usa `createAuthDeps()`.
 */
export function makeAuthMiddleware(deps: AuthDeps): AuthMiddleware {
  return {
    requireAuth: createHandler(deps, { allowGuest: false }),
    optionalAuth: createHandler(deps, { allowGuest: true }),
  };
}

/**
 * Dependências reais, ou `null` quando `CLERK_SECRET_KEY` não está definida.
 *
 * O `null` é o modo legado: sem a env, nenhum middleware é montado e
 * `req.auth` permanece `undefined`.
 */
export function createAuthDeps(): AuthDeps | null {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  const client = createClerkClient({
    secretKey,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  return {
    getState: (requestState) => authenticateRequestState(client, requestState),
    getUser: (clerkId) => fetchClerkProfile(client, clerkId),
    find: findUserByClerkId,
    upsert: upsertUserFromMirror,
    touch: touchSession,
  };
}

interface HandlerOptions {
  /** Sem header, `optionalAuth` segue como convidado em vez de 401. */
  allowGuest: boolean;
}

function createHandler(deps: AuthDeps, options: HandlerOptions): RequestHandler {
  // Sem `asyncHandler`: ele não devolve a promise, e os testes precisam
  // aguardar o middleware. O Express 5 encaminha rejeições ao errorHandler.
  return async (req: Request, res: Response, next): Promise<void> => {
    const requestHeaders = buildRequestHeaders(req);

    if (options.allowGuest && !requestHeaders.has('authorization')) {
      req.auth = { guest: true };
      next();
      return;
    }

    const identity = await readIdentity(deps, requestHeaders);

    if (!identity) {
      respondUnauthorized(res);
      return;
    }

    req.auth = { guest: false, clerkId: identity.sub };
    await ensureMirror(deps, identity.sub);

    if (identity.sid) {
      await deps.touch(identity.sub, identity.sid);
    }

    next();
  };
}

/**
 * Consulta o estado da sessão. Token inválido/expirado vira 401 — nunca
 * rebaixar silenciosamente para convidado (o cliente renova e tenta de novo).
 */
async function readIdentity(
  deps: AuthDeps,
  requestHeaders: Headers,
): Promise<SessionIdentity | null> {
  try {
    return await deps.getState({ requestHeaders });
  } catch {
    return null;
  }
}

/** Garante o espelho local antes de registrar a sessão. */
async function ensureMirror(deps: AuthDeps, clerkId: string): Promise<void> {
  const existing = await deps.find(clerkId);

  if (existing) {
    return;
  }

  const profile = await deps.getUser(clerkId);
  await deps.upsert(clerkId, mapClerkUserToMirror(profile));
}

function buildRequestHeaders(req: Request): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }

    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }

  return headers;
}

function respondUnauthorized(res: Response): void {
  res.status(401).json({ error: 'Não autenticado' });
}

async function authenticateRequestState(
  client: ClerkClient,
  requestState: RequestState,
): Promise<SessionIdentity | null> {
  // A partir do v3 o `authenticateRequest` recebe um `Request` da web; a URL
  // é só o envelope do header Authorization e não participa da validação.
  const request = new Request('http://localhost', {
    headers: requestState.requestHeaders,
  });
  const state = await client.authenticateRequest(request);

  if (!state.isAuthenticated) {
    return null;
  }

  const auth = state.toAuth();

  if (!auth.userId) {
    return null;
  }

  return { sub: auth.userId, sid: auth.sessionId ?? undefined };
}

async function fetchClerkProfile(
  client: ClerkClient,
  clerkId: string,
): Promise<ClerkUserData> {
  return toClerkUserData(await client.users.getUser(clerkId));
}

/** Adapta o recurso camelCase da Backend API ao formato snake_case do webhook. */
function toClerkUserData(user: ClerkUser): ClerkUserData {
  return {
    id: user.id,
    first_name: user.firstName ?? undefined,
    last_name: user.lastName ?? undefined,
    email_addresses: user.emailAddresses.map(({ id, emailAddress }) => ({
      id,
      email_address: emailAddress,
    })),
    primary_email_address_id: user.primaryEmailAddressId ?? undefined,
    phone_numbers: user.phoneNumbers.map(({ id, phoneNumber }) => ({
      id,
      phone_number: phoneNumber,
    })),
    primary_phone_number_id: user.primaryPhoneNumberId ?? undefined,
    image_url: user.imageUrl,
  };
}
