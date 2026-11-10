import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryModel } from '../models/category.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { UserModel } from '../models/user.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

const { sessoes } = vi.hoisted(() => ({
  sessoes: new Map<string, string>([
    ['token_dono', 'user_dono'],
    ['token_admin', 'user_admin'],
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

vi.mock('../models/category.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CategoryModel: criarModeloEmMemoria() };
});

vi.mock('../models/city.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CityModel: criarModeloEmMemoria() };
});

vi.mock('../models/company.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CompanyModel: criarModeloEmMemoria() };
});

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloCategorias = CategoryModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

const ID_CATEGORIA = '000000000000000000000120';
const ID_CIDADE = '000000000000000000000320';
const ID_EMPRESA = '000000000000000000000220';

const categoriasFake: MemoryDocument[] = [
  { _id: ID_CATEGORIA, slug: 'restaurante', name: 'Restaurantes' },
];

const cidadesFake: MemoryDocument[] = [
  { _id: ID_CIDADE, name: 'Castelo do Piauí', slug: 'castelo-do-piaui', state: 'PI' },
];

const empresasFake: MemoryDocument[] = [
  {
    _id: ID_EMPRESA,
    slug: 'pizzaria-dona',
    name: 'Pizzaria do Dono',
    description: 'Pizzas',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'free',
    ownerClerkId: 'user_dono',
  },
];

const usuariosFake: MemoryDocument[] = [
  {
    clerkId: 'user_dono',
    name: 'Dono',
    email: 'dono@example.com',
    role: 'user',
    city: { _id: ID_CIDADE, name: 'Castelo do Piauí', slug: 'castelo-do-piaui' },
  },
  {
    clerkId: 'user_admin',
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    city: { _id: ID_CIDADE, name: 'Castelo do Piauí', slug: 'castelo-do-piaui' },
  },
];

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  modeloCategorias.documents.length = 0;
  modeloCategorias.documents.push(...categoriasFake.map((doc) => ({ ...doc })));

  modeloCidades.documents.length = 0;
  modeloCidades.documents.push(...cidadesFake.map((doc) => ({ ...doc })));

  modeloEmpresas.documents.length = 0;
  modeloEmpresas.documents.push(...empresasFake.map((doc) => ({ ...doc })));

  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((doc) => ({ ...doc })));
});

describe('Autorização do plano (Task 2b)', () => {
  it('PUT /companies/:id com plan no body → 422 (schema strict omitiu plan)', async () => {
    const response = await request(app)
      .put(`/api/companies/${ID_EMPRESA}`)
      .set('Authorization', 'Bearer token_dono')
      .send({ plan: 'premium', name: 'Novo Nome' });

    expect(response.status).toBe(422);
    const empresa = modeloEmpresas.documents[0];
    expect(empresa.plan).toBe('free');
    expect(empresa.name).toBe('Pizzaria do Dono');
  });

  it('PUT /companies/:id/plan sem ser admin → 403 e plano intacto', async () => {
    const response = await request(app)
      .put(`/api/companies/${ID_EMPRESA}/plan`)
      .set('Authorization', 'Bearer token_dono')
      .send({ plan: 'premium' });

    expect(response.status).toBe(403);
    expect(modeloEmpresas.documents[0].plan).toBe('free');
  });

  it('admin altera o plano pela rota dedicada', async () => {
    const response = await request(app)
      .put(`/api/companies/${ID_EMPRESA}/plan`)
      .set('Authorization', 'Bearer token_admin')
      .send({ plan: 'premium' });

    expect(response.status).toBe(200);
    expect(modeloEmpresas.documents[0].plan).toBe('premium');
  });

  it('plan inválido na rota dedicada → 422', async () => {
    const response = await request(app)
      .put(`/api/companies/${ID_EMPRESA}/plan`)
      .set('Authorization', 'Bearer token_admin')
      .send({ plan: 'gold' });

    expect(response.status).toBe(422);
    expect(modeloEmpresas.documents[0].plan).toBe('free');
  });
});
