import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { User } from '../../../shared/domain.js';
import type { ClerkUserData } from '../utils/clerk-user.js';
import { mapClerkUserToMirror } from '../utils/clerk-user.js';
import type {
  AuthDeps,
  RequestState,
  SessionIdentity,
} from './auth.middleware.js';
import { createAuthDeps, makeAuthMiddleware } from './auth.middleware.js';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Perfil no formato da Backend API/webhook do Clerk (snake_case). */
const profileFake: ClerkUserData = {
  id: 'user_123',
  first_name: 'Maria',
  last_name: 'Silva',
  email_addresses: [{ id: 'em_1', email_address: 'maria@example.com' }],
  primary_email_address_id: 'em_1',
  phone_numbers: [{ id: 'ph_1', phone_number: '+5584999999999' }],
  primary_phone_number_id: 'ph_1',
  image_url: 'https://img.clerk.com/m.png',
};

const mirrorFake: User = {
  _id: '665000000000000000000001',
  clerkId: 'user_123',
  firstName: 'Maria',
  lastName: 'Silva',
  email: 'maria@example.com',
  phone: '+5584999999999',
  imageUrl: 'https://img.clerk.com/m.png',
  role: 'user',
};

function buildDeps(overrides: Partial<AuthDeps> = {}): AuthDeps {
  return {
    getState: async () => null,
    getUser: async () => profileFake,
    find: async () => null,
    upsert: async () => mirrorFake,
    touch: async () => {},
    ...overrides,
  };
}

function fakeRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as unknown as Request;
}

function fakeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response & typeof response;
}

describe('requireAuth', () => {
  it('responde 401 sem header, consultando o estado com headers vazios', async () => {
    const getState = vi.fn<
      (requestState: RequestState) => Promise<SessionIdentity | null>
    >(async () => null);
    const { requireAuth } = makeAuthMiddleware(buildDeps({ getState }));
    const response = fakeResponse();

    await requireAuth(fakeRequest(), response, vi.fn());

    expect(getState).toHaveBeenCalledTimes(1);

    const requestState = getState.mock.calls[0]?.[0];
    expect(requestState?.requestHeaders).toBeInstanceOf(Headers);
    expect(requestState?.requestHeaders.has('authorization')).toBe(false);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Não autenticado' });
  });

  it('injeta o clerkId e sincroniza o mirror antes de tocar a sessão', async () => {
    const getState = vi.fn(async () => ({ sub: 'user_123', sid: 'sess_1' }));
    const getUser = vi.fn(async () => profileFake);
    const find = vi.fn(async () => null);
    const upsert = vi.fn(async () => mirrorFake);
    const touch = vi.fn(async () => {});
    const { requireAuth } = makeAuthMiddleware(
      buildDeps({ getState, getUser, find, upsert, touch }),
    );
    const request = fakeRequest('Bearer token_valido');
    const next = vi.fn();

    await requireAuth(request, fakeResponse(), next);

    expect(request.auth).toEqual({ guest: false, clerkId: 'user_123' });
    expect(find).toHaveBeenCalledWith('user_123');
    expect(getUser).toHaveBeenCalledWith('user_123');
    expect(upsert).toHaveBeenCalledWith(
      'user_123',
      mapClerkUserToMirror(profileFake),
    );
    expect(touch).toHaveBeenCalledWith('user_123', 'sess_1');
    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  it('marca guest quando não há header de autorização', async () => {
    const getState = vi.fn(async () => null);
    const { optionalAuth } = makeAuthMiddleware(buildDeps({ getState }));
    const request = fakeRequest();
    const response = fakeResponse();
    const next = vi.fn();

    await optionalAuth(request, response, next);

    expect(request.auth).toEqual({ guest: true });
    expect(getState).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('responde 401 com header expirado, sem rebaixar para guest', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const getState = vi.fn(async () => {
      throw new Error('Authorization: Bearer segredo123 expirado');
    });
    const { optionalAuth } = makeAuthMiddleware(buildDeps({ getState }));
    const request = fakeRequest('Bearer segredo123');
    const response = fakeResponse();
    const next = vi.fn();

    await optionalAuth(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Não autenticado' });
    expect(request.auth).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);

    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain('expirado');
    expect(message).toContain('Bearer [redigido]');
    expect(message).not.toContain('segredo123');
  });
});

describe('createAuthDeps', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falha rápido quando há secret sem publishable', () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
    vi.stubEnv('CLERK_PUBLISHABLE_KEY', '');

    expect(() => createAuthDeps()).toThrow(/CLERK_PUBLISHABLE_KEY/);
  });

  it('mantém o modo legado sem secret', () => {
    vi.stubEnv('CLERK_SECRET_KEY', '');

    expect(createAuthDeps()).toBeNull();
  });
});
