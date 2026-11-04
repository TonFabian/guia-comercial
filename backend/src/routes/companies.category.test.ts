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
    authenticateRequest: async (request: Request) => {
      const authorization = request.headers.get('authorization') ?? '';
      if (!authorization) {
        return { isAuthenticated: false, toAuth: () => ({ userId: null }) };
      }
      return {
        isAuthenticated: true,
        toAuth: () => ({ userId: 'user_admin', sessionId: 'sess_1' }),
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

vi.mock('../models/category.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CategoryModel: criarModeloEmMemoria() };
});

vi.mock('../models/company.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CompanyModel: criarModeloEmMemoria() };
});

vi.mock('../models/city.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CityModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloCategorias = CategoryModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;

const categoriasFake: MemoryDocument[] = [
  { _id: '000000000000000000000030', name: 'Beleza', slug: 'beleza' },
  { _id: '000000000000000000000031', name: 'Restaurantes', slug: 'restaurantes' },
  { _id: '000000000000000000000032', name: 'Oficina', slug: 'oficina' },
];

const empresasFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000040',
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    description: 'Cortes e barba',
    category: '000000000000000000000030',
    isFeatured: false,
  },
  {
    _id: '000000000000000000000041',
    name: 'Salão de Beleza',
    slug: 'salao-de-beleza',
    description: 'Cuidado capilar',
    category: '000000000000000000000030',
    isFeatured: false,
  },
  {
    _id: '000000000000000000000042',
    name: 'Restaurante Sabor',
    slug: 'restaurante-sabor',
    description: 'Comida caseira',
    category: '000000000000000000000031',
    isFeatured: false,
  },
  {
    _id: '000000000000000000000043',
    name: 'Oficina do Zé',
    slug: 'oficina-do-ze',
    description: 'Mecânica automotiva',
    category: '000000000000000000000032',
    isFeatured: false,
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
  modeloCategorias.documents.push(...categoriasFake.map((categoria) => ({ ...categoria })));

  modeloEmpresas.documents.length = 0;
  modeloEmpresas.documents.push(...empresasFake.map((empresa) => ({ ...empresa })));

  modeloCidades.documents.length = 0;
});

describe('GET /api/companies com várias categorias', () => {
  it('filtra pelas duas categorias informadas', async () => {
    const response = await request(app).get('/api/companies?category=beleza,restaurantes');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);

    const nomes = response.body.items.map((empresa: { name: string }) => empresa.name);
    expect(nomes).toContain('Barbearia Central');
    expect(nomes).toContain('Salão de Beleza');
    expect(nomes).toContain('Restaurante Sabor');
    expect(nomes).not.toContain('Oficina do Zé');
  });

  it('mantém o filtro de uma categoria única', async () => {
    const response = await request(app).get('/api/companies?category=beleza');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
  });

  it('ignora categoria inexente e mantém as válidas', async () => {
    const response = await request(app).get('/api/companies?category=beleza,categoria-que-nao-existe');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
  });

  it('devolve página vazia quando nenhuma categoria existe', async () => {
    const response = await request(app).get('/api/companies?category=categoria-que-nao-existe');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect(response.body.items).toHaveLength(0);
  });
});
