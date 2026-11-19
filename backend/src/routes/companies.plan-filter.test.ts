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

const ID_CATEGORIA = '000000000000000000000140';
const ID_CIDADE = '000000000000000000000340';

const categoriasFake: MemoryDocument[] = [
  { _id: ID_CATEGORIA, slug: 'restaurante', name: 'Restaurantes' },
];

const cidadesFake: MemoryDocument[] = [
  { _id: ID_CIDADE, name: 'Castelo do Piauí', slug: 'castelo-do-piaui', state: 'PI' },
];

// C sem plan: ausente → tratada como free no filtro.
const empresasFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000241',
    slug: 'a-free',
    name: 'A Free',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'free',
  },
  {
    _id: '000000000000000000000242',
    slug: 'b-premium',
    name: 'B Premium',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'premium',
  },
  {
    _id: '000000000000000000000243',
    slug: 'c-sem-plan',
    name: 'C Sem Plan',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
  },
  {
    _id: '000000000000000000000244',
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

describe('GET /api/companies?plan', () => {
  it('devolve somente empresas premium', async () => {
    const response = await request(app).get('/api/companies?plan=premium');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items.map((empresa: { name: string }) => empresa.name)).toEqual([
      'B Premium',
    ]);
  });

  it('devolve básico e free, incluindo empresa sem plan', async () => {
    const response = await request(app).get('/api/companies?plan=basic,free');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items.map((empresa: { name: string }) => empresa.name)).toEqual([
      'A Free',
      'C Sem Plan',
      'D Basic',
    ]);
  });

  it('inclui empresa sem plan no filtro free', async () => {
    const response = await request(app).get('/api/companies?plan=free');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.items.map((empresa: { name: string }) => empresa.name)).toEqual([
      'A Free',
      'C Sem Plan',
    ]);
  });

  it('deduplica planos repetidos na lista', async () => {
    const response = await request(app).get('/api/companies?plan=premium,premium');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
  });

  it('plan inválido → 400', async () => {
    const response = await request(app).get('/api/companies?plan=gold');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'plan'");
  });

  it('plan vazio → sem filtro', async () => {
    const response = await request(app).get('/api/companies?plan=');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(4);
  });

  it('plan repetido como parâmetro → 400', async () => {
    const response = await request(app).get('/api/companies?plan=free&plan=premium');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'plan'");
  });

  it('combina busca textual com filtro de plano', async () => {
    const premium = await request(app).get('/api/companies?q=Premium&plan=premium');
    expect(premium.status).toBe(200);
    expect(premium.body.total).toBe(1);

    const free = await request(app).get('/api/companies?q=Premium&plan=free');
    expect(free.status).toBe(200);
    expect(free.body.total).toBe(0);
  });
});
