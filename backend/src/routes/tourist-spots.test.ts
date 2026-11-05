import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TouristSpotModel } from '../models/tourist-spot.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
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

vi.mock('../models/tourist-spot.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { TouristSpotModel: criarModeloEmMemoria() };
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

const modeloPontos = TouristSpotModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

const pontosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000001',
    name: 'Mirante do Serra',
    slug: 'mirante-do-serra',
    description: 'Vista do vale e do Rio Canindé',
    category: 'viewpoint',
    city: '000000000000000000000020',
    entryFee: 'free',
    order: 1,
    active: true,
  },
  {
    _id: '000000000000000000000002',
    name: 'Cachoeira do Retiro',
    slug: 'cachoeira-do-retiro',
    description: 'Banho de rio em propriedade particular',
    category: 'waterfall',
    city: null,
    entryFee: 'paid',
    entryPrice: 'R$ 10,00',
    order: 2,
    active: true,
  },
  {
    _id: '000000000000000000000003',
    name: 'Museu Regional',
    slug: 'museu-regional',
    description: 'História e memória do município',
    category: 'museum',
    city: '000000000000000000000021',
    entryFee: 'free',
    order: 3,
    active: false,
  },
];

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

const empresasFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000030',
    name: 'Parque Municipal',
    slug: 'parque-municipal',
    description: 'Empresa relacionada ao ponto turístico',
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
  {
    _id: '000000000000000000000011',
    clerkId: 'user_comum',
    email: 'maria@example.com',
    firstName: 'Maria',
    lastName: 'Silva',
    role: 'user',
  },
];

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  modeloPontos.documents.length = 0;
  modeloPontos.documents.push(...pontosFake.map((ponto) => ({ ...ponto })));

  modeloCidades.documents.length = 0;
  modeloCidades.documents.push(...cidadesFake.map((cidade) => ({ ...cidade })));

  modeloEmpresas.documents.length = 0;
  modeloEmpresas.documents.push(...empresasFake.map((empresa) => ({ ...empresa })));

  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((usuario) => ({ ...usuario })));
});

describe('GET /api/tourist-spots', () => {
  it('responde a página paginada no shape Paginated', async () => {
    const response = await request(app).get('/api/tourist-spots');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0].slug).toBe('mirante-do-serra');
  });

  it('filtra os pontos pela categoria informada', async () => {
    const response = await request(app).get('/api/tourist-spots?category=museum');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Museu Regional');
  });

  it('filtra os pontos pelo flag active', async () => {
    const response = await request(app).get('/api/tourist-spots?active=false');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Museu Regional');
  });

  it('filtra os pontos pela cidade informada (slug)', async () => {
    const response = await request(app).get('/api/tourist-spots?city=castelo-do-piaui');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Mirante do Serra');
  });

  it('responde 404 para id malformado', async () => {
    const response = await request(app).get('/api/tourist-spots/nao-e-um-object-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('id inválido');
  });
});

describe('POST /api/tourist-spots', () => {
  const payloadValido = {
    name: 'Gruta da Cruz',
    slug: 'gruta-da-cruz',
    description: 'Formação rochosa com mirante',
    category: 'nature',
    active: true,
    city: 'castelo-do-piaui',
    entryFee: 'free',
  };

  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app).post('/api/tourist-spots').send(payloadValido);

    expect(response.status).toBe(401);
    expect(modeloPontos.documents).toHaveLength(3);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .post('/api/tourist-spots')
      .set('Authorization', 'Bearer token_comum')
      .send(payloadValido);

    expect(response.status).toBe(403);
    expect(modeloPontos.documents).toHaveLength(3);
  });

  it('cria o ponto turístico quando a sessão é de admin', async () => {
    const response = await request(app)
      .post('/api/tourist-spots')
      .set('Authorization', 'Bearer token_admin')
      .send({ ...payloadValido, relatedCompany: 'parque-municipal' });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Gruta da Cruz');
    expect(modeloPontos.documents).toHaveLength(4);
    // `city` e `relatedCompany` (dado por slug) viram referência de ObjectId.
    expect(modeloPontos.documents[3]?.city).toBe('000000000000000000000020');
    expect(modeloPontos.documents[3]?.relatedCompany).toBe('000000000000000000000030');
  });

  it('responde 422 para payload sem campos obrigatórios', async () => {
    const response = await request(app)
      .post('/api/tourist-spots')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Sem demais campos' });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Payload inválido');
    expect(modeloPontos.documents).toHaveLength(3);
  });

  it('responde 422 quando a entrada é paga sem o preço de entrada', async () => {
    const response = await request(app)
      .post('/api/tourist-spots')
      .set('Authorization', 'Bearer token_admin')
      .send({ ...payloadValido, entryFee: 'paid' });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('entryPrice');
    expect(modeloPontos.documents).toHaveLength(3);
  });

  it('responde 409 para slug já utilizado', async () => {
    const response = await request(app)
      .post('/api/tourist-spots')
      .set('Authorization', 'Bearer token_admin')
      .send({ ...payloadValido, slug: 'mirante-do-serra' });

    expect(response.status).toBe(409);
    expect(modeloPontos.documents).toHaveLength(3);
  });
});

describe('PUT /api/tourist-spots', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app)
      .put('/api/tourist-spots/000000000000000000000001')
      .send({ name: 'Outro nome' });

    expect(response.status).toBe(401);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .put('/api/tourist-spots/000000000000000000000001')
      .set('Authorization', 'Bearer token_comum')
      .send({ name: 'Outro nome' });

    expect(response.status).toBe(403);
    expect(modeloPontos.documents[0]?.name).toBe('Mirante do Serra');
  });

  it('atualiza o ponto turístico quando a sessão é de admin', async () => {
    const response = await request(app)
      .put('/api/tourist-spots/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Mirante do Serra Atualizado', description: 'Novo texto' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Mirante do Serra Atualizado');
    expect(modeloPontos.documents[0]?.name).toBe('Mirante do Serra Atualizado');
    expect(modeloPontos.documents[0]?.description).toBe('Novo texto');
  });
});

describe('DELETE /api/tourist-spots', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app).delete('/api/tourist-spots/000000000000000000000001');

    expect(response.status).toBe(401);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .delete('/api/tourist-spots/000000000000000000000001')
      .set('Authorization', 'Bearer token_comum');

    expect(response.status).toBe(403);
    expect(modeloPontos.documents).toHaveLength(3);
  });

  it('remove o ponto turístico quando a sessão é de admin', async () => {
    const response = await request(app)
      .delete('/api/tourist-spots/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin');

    expect(response.status).toBe(204);
    expect(modeloPontos.documents).toHaveLength(2);
  });
});
