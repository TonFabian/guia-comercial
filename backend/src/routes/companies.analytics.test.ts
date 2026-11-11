import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryModel } from '../models/category.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyAnalyticsModel } from '../models/company-analytics.model.js';
import { CompanyModel } from '../models/company.model.js';
import { UserModel } from '../models/user.model.js';
import { limparRateLimitAnalytics } from '../middlewares/analytics-rate-limit.middleware.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

/** Sessões fake do Clerk: token -> clerkId. */
const { sessoes } = vi.hoisted(() => ({
  sessoes: new Map<string, string>([
    ['token_dono', 'user_dono'],
    ['token_admin', 'user_admin'],
    ['token_outro', 'user_outro'],
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

vi.mock('../models/company-analytics.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CompanyAnalyticsModel: criarModeloEmMemoria() };
});

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloCategorias = CategoryModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloAnalytics = CompanyAnalyticsModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

const ID_CATEGORIA = '000000000000000000000110';
const ID_CIDADE = '000000000000000000000310';
const ID_PREMIUM = '000000000000000000000210';
const ID_FREE = '000000000000000000000211';

const categoriasFake: MemoryDocument[] = [
  { _id: ID_CATEGORIA, slug: 'restaurante', name: 'Restaurantes' },
];

const cidadesFake: MemoryDocument[] = [
  { _id: ID_CIDADE, name: 'Castelo do Piauí', slug: 'castelo-do-piaui', state: 'PI' },
];

const empresasFake: MemoryDocument[] = [
  {
    _id: ID_PREMIUM,
    slug: 'pizzaria-premium',
    name: 'Pizzaria Premium',
    description: 'Pizzas artesanais',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'premium',
    ownerClerkId: 'user_dono',
  },
  {
    _id: ID_FREE,
    slug: 'pizzaria-free',
    name: 'Pizzaria Gratuita',
    description: 'Pizzas simples',
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
  {
    clerkId: 'user_outro',
    name: 'Outro',
    email: 'outro@example.com',
    role: 'user',
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
  limparRateLimitAnalytics();

  modeloCategorias.documents.length = 0;
  modeloCategorias.documents.push(...categoriasFake.map((doc) => ({ ...doc })));

  modeloCidades.documents.length = 0;
  modeloCidades.documents.push(...cidadesFake.map((doc) => ({ ...doc })));

  modeloEmpresas.documents.length = 0;
  modeloEmpresas.documents.push(...empresasFake.map((doc) => ({ ...doc })));

  modeloAnalytics.documents.length = 0;

  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((doc) => ({ ...doc })));
});

describe('POST /api/companies/:id/view', () => {
  it('convidado incrementa view (anônimo permitido)', async () => {
    const response = await request(app).post(`/api/companies/${ID_PREMIUM}/view`);

    expect(response.status).toBe(204);
    expect(modeloAnalytics.documents).toHaveLength(1);
    expect(modeloAnalytics.documents[0].views).toBe(1);
  });

  it('empresa inexistente → 404', async () => {
    const response = await request(app).post('/api/companies/000000000000000000000999/view');

    expect(response.status).toBe(404);
  });

  it('id malformado → 404 (não 500)', async () => {
    const response = await request(app).post('/api/companies/nao-e-id/view');

    expect(response.status).toBe(404);
  });

  it('segundo POST do mesmo IP para a mesma empresa → 429 e contador intacto', async () => {
    await request(app).post(`/api/companies/${ID_PREMIUM}/view`);
    const segunda = await request(app).post(`/api/companies/${ID_PREMIUM}/view`);

    expect(segunda.status).toBe(429);
    expect(modeloAnalytics.documents[0].views).toBe(1);
  });

  it('mesmo IP pode incrementar empresa diferente (limite é por empresa)', async () => {
    await request(app).post(`/api/companies/${ID_PREMIUM}/view`);
    const outra = await request(app).post(`/api/companies/${ID_FREE}/view`);

    expect(outra.status).toBe(204);
  });
});

describe('POST /api/companies/:id/whatsapp-click', () => {
  it('usuário autenticado incrementa clique', async () => {
    const response = await request(app)
      .post(`/api/companies/${ID_PREMIUM}/whatsapp-click`)
      .set('Authorization', 'Bearer token_dono');

    expect(response.status).toBe(204);
    expect(modeloAnalytics.documents[0].whatsappClicks).toBe(1);
  });

  it('sem sessão (visitante) também registra o clique — rate limit é a defesa', async () => {
    const response = await request(app).post(`/api/companies/${ID_PREMIUM}/whatsapp-click`);

    expect(response.status).toBe(204);
    expect(modeloAnalytics.documents[0].whatsappClicks).toBe(1);
  });

  it('sexto clique do mesmo IP na mesma empresa → 429', async () => {
    for (let i = 0; i < 5; i += 1) {
      const resposta = await request(app)
        .post(`/api/companies/${ID_PREMIUM}/whatsapp-click`)
        .set('Authorization', 'Bearer token_dono');
      expect(resposta.status).toBe(204);
    }

    const sexto = await request(app)
      .post(`/api/companies/${ID_PREMIUM}/whatsapp-click`)
      .set('Authorization', 'Bearer token_dono');

    expect(sexto.status).toBe(429);
    expect(modeloAnalytics.documents[0].whatsappClicks).toBe(5);
  });
});

describe('GET /api/companies/:id/analytics', () => {
  it('dono premium recebe o resumo do período', async () => {
    await request(app).post(`/api/companies/${ID_PREMIUM}/view`);
    await request(app)
      .post(`/api/companies/${ID_PREMIUM}/whatsapp-click`)
      .set('Authorization', 'Bearer token_dono');

    const response = await request(app)
      .get(`/api/companies/${ID_PREMIUM}/analytics`)
      .set('Authorization', 'Bearer token_dono');

    expect(response.status).toBe(200);
    expect(response.body.companyId).toBe(ID_PREMIUM);
    expect(response.body.views).toBe(1);
    expect(response.body.whatsappClicks).toBe(1);
  });

  it('terceiro (não dono, não admin) → 403', async () => {
    const response = await request(app)
      .get(`/api/companies/${ID_PREMIUM}/analytics`)
      .set('Authorization', 'Bearer token_outro');

    expect(response.status).toBe(403);
  });

  it('sem sessão → 401', async () => {
    const response = await request(app).get(`/api/companies/${ID_PREMIUM}/analytics`);

    expect(response.status).toBe(401);
  });

  it('empresa free → 403 (analytics é feature Premium)', async () => {
    const response = await request(app)
      .get(`/api/companies/${ID_FREE}/analytics`)
      .set('Authorization', 'Bearer token_dono');

    expect(response.status).toBe(403);
  });

  it('id malformado → 404 (não 500)', async () => {
    const response = await request(app)
      .get('/api/companies/nao-e-id/analytics')
      .set('Authorization', 'Bearer token_dono');

    expect(response.status).toBe(404);
  });

  it('from/to fora do formato YYYY-MM-DD → 400', async () => {
    const response = await request(app)
      .get(`/api/companies/${ID_PREMIUM}/analytics?from=abc&to=2026-13-01`)
      .set('Authorization', 'Bearer token_dono');

    expect(response.status).toBe(400);
  });

  it('resumo não vaza dados de outra empresa (isolamento)', async () => {
    await request(app).post(`/api/companies/${ID_PREMIUM}/view`);
    await request(app).post(`/api/companies/${ID_FREE}/view`);
    await request(app).post(`/api/companies/${ID_FREE}/view`);

    const premium = await request(app)
      .get(`/api/companies/${ID_PREMIUM}/analytics`)
      .set('Authorization', 'Bearer token_dono');

    expect(premium.status).toBe(200);
    expect(premium.body.views).toBe(1);
    expect(JSON.stringify(premium.body)).not.toContain(ID_FREE);
  });
});
