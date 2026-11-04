import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CityModel } from '../models/city.model.js';
import { UserModel } from '../models/user.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

/** Sessões fake do Clerk: token -> clerkId. */
const { sessoes } = vi.hoisted(() => ({
  sessoes: new Map<string, string>([
    ['token_admin', 'user_admin'],
    ['token_comum', 'user_comum'],
  ]),
}));

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    authenticateRequest: async (request: Request) => {
      const authorization = request.headers.get('authorization') ?? '';
      const userId = sessoes.get(authorization.replace('Bearer ', ''));
      if (!userId) {
        return { isAuthenticated: false, toAuth: () => ({ userId: null }) };
      }
      return { isAuthenticated: true, toAuth: () => ({ userId, sessionId: 'sess_1' }) };
    },
    users: {
      getUser: async (id: string) => ({
        id,
        firstName: 'Perfil',
        lastName: 'Clerk',
        emailAddresses: [{ id: 'em_1', emailAddress: `${id}@example.com` }],
        primaryEmailAddressId: 'em_1',
        phoneNumbers: [],
        primaryPhoneNumberId: null,
        imageUrl: 'https://img.clerk.com/perfil.png',
      }),
    },
  }),
}));

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

vi.mock('../models/city.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CityModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloUsuarios = UserModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;

const usuariosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000010',
    clerkId: 'user_admin',
    email: 'admin@example.com',
    firstName: 'Ana',
    lastName: 'Admin',
    role: 'admin',
    city: '000000000000000000000020',
    createdAt: '2026-01-02T10:00:00.000Z',
    pushToken: 'push-token-secreto',
  },
  {
    _id: '000000000000000000000011',
    clerkId: 'user_comum',
    email: 'maria@example.com',
    firstName: 'Maria',
    lastName: 'Silva',
    role: 'user',
    city: '000000000000000000000020',
    createdAt: '2026-01-01T10:00:00.000Z',
    pushToken: 'push-token-secreto',
  },
];

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((usuario) => ({ ...usuario })));

  modeloCidades.documents.length = 0;
  modeloCidades.documents.push({
    _id: '000000000000000000000020',
    name: 'Castelo do Piauí',
    slug: 'castelo-do-piaui',
    state: 'PI',
  });
});

describe('GET /api/users', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Não autenticado');
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer token_comum');

    expect(response.status).toBe(403);
  });

  it('lista os usuários sem expor o pushToken', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer token_admin');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].pushToken).toBeUndefined();
  });

  it('devolve nome, e-mail, role, cidade e data de criação do usuário', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer token_admin');

    const usuario = response.body.items.find(
      (item: { email: string }) => item.email === 'maria@example.com',
    );

    expect(usuario.name).toBe('Maria Silva');
    expect(usuario.role).toBe('user');
    expect(usuario.city).toBe('000000000000000000000020');
    expect(usuario.createdAt).toBe('2026-01-01T10:00:00.000Z');
  });
});
