import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CityModel } from '../models/city.model.js';
import { UserModel } from '../models/user.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    authenticateRequest: async (request: Request) => {
      const authorization = request.headers.get('authorization') ?? '';
      const semSessao = !authorization;
      return {
        isAuthenticated: !semSessao,
        toAuth: () => ({ userId: semSessao ? null : 'user_admin', sessionId: 'sess_1' }),
      };
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

vi.mock('../models/city.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CityModel: criarModeloEmMemoria() };
});

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloCidades = CityModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

const cidadesFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000020',
    name: 'Castelo do Piauí',
    slug: 'castelo-do-piaui',
    state: 'PI',
  },
  {
    _id: '000000000000000000000021',
    name: 'Regeneração',
    slug: 'regeneracao',
    state: 'PI',
  },
];

const usuariosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000010',
    clerkId: 'user_admin',
    email: 'admin@example.com',
    firstName: 'Ana',
    lastName: 'Admin',
    role: 'admin',
  },
];

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  modeloCidades.documents.length = 0;
  modeloCidades.documents.push(...cidadesFake.map((cidade) => ({ ...cidade })));

  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((usuario) => ({ ...usuario })));
});

describe('GET /api/cities', () => {
  it('devolve array de cidades ordenado por nome', async () => {
    const response = await request(app).get('/api/cities');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.map((cidade: { name: string }) => cidade.name)).toEqual([
      'Castelo do Piauí',
      'Regeneração',
    ]);
  });

  it('teto de 500 resultados: 505 cidades devolvem exatamente 500', async () => {
    modeloCidades.documents.length = 0;
    modeloCidades.documents.push(
      ...Array.from({ length: 505 }, (_, i) => ({
        _id: (i + 1).toString().padStart(24, '0'),
        name: `Cidade ${i.toString().padStart(3, '0')}`,
        slug: `cidade-${i}`,
        state: 'PI',
      })),
    );

    const response = await request(app).get('/api/cities');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(500);
  });
});

describe('DELETE /api/cities com id malformado', () => {
  it('id malformado → 404 (antes dependia do CastError do Mongoose)', async () => {
    const response = await request(app)
      .delete('/api/cities/xyz')
      .set('Authorization', 'Bearer token_admin');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('cidade não encontrada');
  });

  it('id inexistente mas válido → 404', async () => {
    const response = await request(app)
      .delete('/api/cities/000000000000000000000099')
      .set('Authorization', 'Bearer token_admin');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('cidade não encontrada');
  });
});
