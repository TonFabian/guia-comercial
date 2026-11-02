import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import type { User } from '../../../shared/domain.js';
import type { findUserByClerkId } from '../services/user.service.js';
import { makeMeController } from './user.controller.js';

const mirrorFake = {
  _id: '665000000000000000000001',
  clerkId: 'user_123',
  firstName: 'Maria',
  lastName: 'Silva',
  email: 'maria@example.com',
  phone: '+5584999999999',
  imageUrl: 'https://img.clerk.com/m.png',
  role: 'user',
} satisfies User;

function fakeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response & typeof response;
}

function fakeRequest(
  auth?: { guest: boolean; clerkId?: string },
): Request {
  return { auth } as unknown as Request;
}

describe('controller /me', () => {
  it('responde o perfil do espelho do usuário autenticado', async () => {
    const find = vi.fn<typeof findUserByClerkId>(async () => mirrorFake);
    const me = makeMeController({ find });
    const response = fakeResponse();

    await me(fakeRequest({ guest: false, clerkId: 'user_123' }), response, vi.fn());

    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({
      _id: '665000000000000000000001',
      clerkId: 'user_123',
      firstName: 'Maria',
      lastName: 'Silva',
      email: 'maria@example.com',
      phone: '+5584999999999',
      imageUrl: 'https://img.clerk.com/m.png',
      role: 'user',
    });
  });

  it('responde 404 quando o espelho ainda não existe', async () => {
    const find = vi.fn<typeof findUserByClerkId>(async () => null);
    const me = makeMeController({ find });
    const response = fakeResponse();

    await me(fakeRequest({ guest: false, clerkId: 'user_123' }), response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: 'perfil não sincronizado ainda',
    });
  });

  it('responde 401 quando o request não tem identidade', async () => {
    const find = vi.fn<typeof findUserByClerkId>(async () => mirrorFake);
    const me = makeMeController({ find });
    const response = fakeResponse();

    await me(fakeRequest(), response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(401);
    expect(find).not.toHaveBeenCalled();
  });
});
