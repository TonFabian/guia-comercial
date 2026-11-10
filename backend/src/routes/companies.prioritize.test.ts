import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryModel } from '../models/category.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    authenticateRequest: async () => ({ isAuthenticated: false, toAuth: () => ({ userId: null }) }),
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

let app: Express;

const modeloCategorias = CategoryModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;

const ID_CATEGORIA = '000000000000000000000130';
const ID_CIDADE = '000000000000000000000330';

const categoriasFake: MemoryDocument[] = [
  { _id: ID_CATEGORIA, slug: 'restaurante', name: 'Restaurantes' },
];

const cidadesFake: MemoryDocument[] = [
  { _id: ID_CIDADE, name: 'Castelo do Piauí', slug: 'castelo-do-piaui', state: 'PI' },
];

// Sem plan em duas empresas: ausente → tratada como free (Review Focus).
const empresasFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000231',
    slug: 'a-free',
    name: 'A Free',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'free',
  },
  {
    _id: '000000000000000000000232',
    slug: 'b-premium',
    name: 'B Premium',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'premium',
  },
  {
    _id: '000000000000000000000233',
    slug: 'c-sem-plan',
    name: 'C Sem Plan',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
  },
  {
    _id: '000000000000000000000234',
    slug: 'd-basic',
    name: 'D Basic',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'basic',
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
});

describe('GET /api/companies?prioritize=plan', () => {
  it('ordena premium > basic > free (sem plan conta como free) sem ocultar', async () => {
    const response = await request(app).get('/api/companies?prioritize=plan');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(4);
    const nomes = response.body.items.map((e: { name: string }) => e.name);
    expect(nomes).toEqual(['B Premium', 'D Basic', 'A Free', 'C Sem Plan']);
  });

  it('sem o parâmetro, mantém a ordenação padrão por nome', async () => {
    const response = await request(app).get('/api/companies');

    expect(response.status).toBe(200);
    const nomes = response.body.items.map((e: { name: string }) => e.name);
    expect(nomes).toEqual(['A Free', 'B Premium', 'C Sem Plan', 'D Basic']);
  });

  it('prioritize inválido → 400', async () => {
    const response = await request(app).get('/api/companies?prioritize=gold');

    expect(response.status).toBe(400);
  });
});
