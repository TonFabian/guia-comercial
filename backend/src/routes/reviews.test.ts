import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewModel } from '../models/review.model.js';
import { CompanyModel } from '../models/company.model.js';
import { UserModel } from '../models/user.model.js';
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

vi.mock('../models/review.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { ReviewModel: criarModeloEmMemoria() };
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

const modeloReviews = ReviewModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

const EMPRESA_ID = '000000000000000000000040';

const empresasFake: MemoryDocument[] = [
  {
    _id: EMPRESA_ID,
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    description: 'Cortes e barba',
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
  modeloEmpresas.documents.length = 0;
  modeloEmpresas.documents.push(...empresasFake.map((empresa) => ({ ...empresa })));

  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((usuario) => ({ ...usuario })));

  modeloReviews.documents.length = 0;
});

describe('GET /api/companies/:id/reviews', () => {
  it('devolve no máximo 50 reviews, do mais recente para o mais antigo', async () => {
    // 55 documentos provam o teto: sem ele a listagem devolvia tudo (55).
    modeloReviews.documents.push(
      ...Array.from({ length: 55 }, (_, i) => ({
        _id: (i + 100).toString().padStart(24, '0'),
        company: EMPRESA_ID,
        clerkId: 'user_admin',
        rating: 5,
        // ISO firme (24 caracteres): a ordem lexicográfica é a cronológica.
        createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
      })),
    );

    const response = await request(app).get(`/api/companies/${EMPRESA_ID}/reviews`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(50);
    expect(response.body[0].createdAt).toBe(new Date(Date.UTC(2026, 0, 55)).toISOString());
  });

  it('id malformado → 404 (antes dependia do CastError do Mongoose)', async () => {
    const response = await request(app).get('/api/companies/abc/reviews');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('empresa não encontrada');
  });
});
