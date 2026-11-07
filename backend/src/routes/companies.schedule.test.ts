import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
        firstName: 'Dono',
        lastName: 'Empresa',
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

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

let app: Express;

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

const modeloEmpresas = CompanyModel as unknown as MemoryModel;

const empresaFake: MemoryDocument = {
  _id: '000000000000000000000060',
  name: 'Mercearia Velha',
  slug: 'mercearia-velha',
  description: 'Compra antiga, schedule vazio',
  category: '000000000000000000000030',
  ownerClerkId: 'user_admin',
};

beforeEach(() => {
  modeloEmpresas.documents.length = 0;
  modeloEmpresas.documents.push({ ...empresaFake });
});

describe('POST /api/companies — deprecação openingHours → schedule', () => {
  it('POST com openingHours parseável gera schedule e mantém openingHours na resposta', async () => {
    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', 'Bearer token_admin')
      .send({
        name: 'Padaria Nova',
        slug: 'padaria-nova',
        description: 'Filial nova',
        category: '000000000000000000000030',
        openingHours: ['Seg a Sex: 08h às 18h'],
      });

    expect(response.status).toBe(201);
    expect(response.body.openingHours).toEqual(['Seg a Sex: 08h às 18h']);
    expect(response.body.schedule).toEqual([
      { day: 1, opens: 480, closes: 1080 },
      { day: 2, opens: 480, closes: 1080 },
      { day: 3, opens: 480, closes: 1080 },
      { day: 4, opens: 480, closes: 1080 },
      { day: 5, opens: 480, closes: 1080 },
    ]);
  });

  it('POST com openingHours não parseável mantém openingHours e não inventa schedule', async () => {
    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', 'Bearer token_admin')
      .send({
        name: 'Lanchonete Horário Estranho',
        slug: 'lanchonete-horario-estranho',
        description: 'Texto livre não parseável',
        category: '000000000000000000000030',
        openingHours: ['Aberto bem cedinho todos os dias'],
      });

    expect(response.status).toBe(201);
    expect(response.body.openingHours).toEqual(['Aberto bem cedinho todos os dias']);
    expect(response.body.schedule).toEqual([]);
  });

  it('POST com schedule enviado prevalece sobre a conversão de openingHours', async () => {
    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', 'Bearer token_admin')
      .send({
        name: 'Pizzeria Estruturada',
        slug: 'pizzeria-estruturada',
        description: 'Schedule completo no payload',
        category: '000000000000000000000030',
        openingHours: ['Seg a Sex: 08h às 18h'],
        schedule: [{ day: 6, opens: 600, closes: 1200 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.schedule).toEqual([{ day: 6, opens: 600, closes: 1200 }]);
  });
});

describe('PUT /api/companies/:id — deprecação openingHours → schedule', () => {
  it('PUT com openingHours e schedule ausente preenche schedule e mantém openingHours', async () => {
    const response = await request(app)
      .put('/api/companies/000000000000000000000060')
      .set('Authorization', 'Bearer token_admin')
      .send({ openingHours: ['Todos os dias: 00h às 23h59'] });

    expect(response.status).toBe(200);
    expect(response.body.openingHours).toEqual(['Todos os dias: 00h às 23h59']);
    expect(response.body.schedule).toHaveLength(7);
  });

  it('PUT com schedule enviado não sobrescreve com openingHours', async () => {
    const response = await request(app)
      .put('/api/companies/000000000000000000000060')
      .set('Authorization', 'Bearer token_admin')
      .send({
        openingHours: ['Seg a Sex: 08h às 18h'],
        schedule: [{ day: 0, opens: 300, closes: 600 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.schedule).toEqual([{ day: 0, opens: 300, closes: 600 }]);
  });
});

afterAll(() => {
  vi.unstubAllEnvs();
});
