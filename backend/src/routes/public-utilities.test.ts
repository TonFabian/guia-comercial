import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicUtilityModel } from '../models/public-utility.model.js';
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

vi.mock('../models/public-utility.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { PublicUtilityModel: criarModeloEmMemoria() };
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

const modeloServicos = PublicUtilityModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;

const servicosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000001',
    name: 'Polícia Militar',
    description: 'Emergência em Castelo do Piauí',
    category: 'emergency',
    phone: '190',
    icon: 'shield-alert',
    order: 1,
    active: true,
  },
  {
    _id: '000000000000000000000002',
    name: 'Polícia Civil',
    description: 'Ocorrências e denúncias',
    category: 'civil',
    phone: '197',
    icon: 'shield-account',
    order: 2,
    active: true,
  },
  {
    _id: '000000000000000000000003',
    name: 'Hospital Nilo Lima',
    description: 'Pronto atendimento municipal',
    category: 'health',
    details: ['Consulte a escala de plantão na recepção do hospital.'],
    icon: 'hospital-building',
    order: 3,
    active: false,
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
  modeloServicos.documents.length = 0;
  modeloServicos.documents.push(...servicosFake.map((servico) => ({ ...servico })));

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

describe('GET /api/public-utilities', () => {
  it('responde a página paginada com os serviços cadastrados', async () => {
    const response = await request(app).get('/api/public-utilities');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.items).toHaveLength(3);
  });

  it('filtra os serviços pela categoria informada', async () => {
    const response = await request(app).get('/api/public-utilities?category=health');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Hospital Nilo Lima');
  });

  it('filtra os serviços pelo flag active', async () => {
    const response = await request(app).get('/api/public-utilities?active=false');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Hospital Nilo Lima');
  });

  it('responde 404 para id malformado', async () => {
    const response = await request(app).get('/api/public-utilities/nao-e-um-object-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('id inválido');
  });
});

describe('POST /api/public-utilities', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app)
      .post('/api/public-utilities')
      .send({ name: 'Bombeiros', description: 'Emergência' });

    expect(response.status).toBe(401);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .post('/api/public-utilities')
      .set('Authorization', 'Bearer token_comum')
      .send({ name: 'Bombeiros', description: 'Emergência' });

    expect(response.status).toBe(403);
    expect(modeloServicos.documents).toHaveLength(3);
  });

  it('cria o serviço quando a sessão é de admin', async () => {
    const response = await request(app)
      .post('/api/public-utilities')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Bombeiros', description: 'Emergência', category: 'emergency' });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Bombeiros');
    expect(modeloServicos.documents).toHaveLength(4);
  });
});

describe('PUT /api/public-utilities', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app)
      .put('/api/public-utilities/000000000000000000000001')
      .send({ name: 'Outro nome' });

    expect(response.status).toBe(401);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .put('/api/public-utilities/000000000000000000000001')
      .set('Authorization', 'Bearer token_comum')
      .send({ name: 'Outro nome' });

    expect(response.status).toBe(403);
    expect(modeloServicos.documents[0]?.name).toBe('Polícia Militar');
  });

  it('atualiza o serviço quando a sessão é de admin', async () => {
    const response = await request(app)
      .put('/api/public-utilities/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Polícia Militar Atualizada', description: 'Novo texto' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Polícia Militar Atualizada');
    expect(modeloServicos.documents[0]?.name).toBe('Polícia Militar Atualizada');
    expect(modeloServicos.documents[0]?.description).toBe('Novo texto');
  });

  it('limpa o telefone quando o painel envia null', async () => {
    const response = await request(app)
      .put('/api/public-utilities/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin')
      .send({ phone: null });

    expect(response.status).toBe(200);
    expect(modeloServicos.documents[0]?.phone).toBeNull();
  });

  it('limpa a cidade quando o painel envia null', async () => {
    const response = await request(app)
      .put('/api/public-utilities/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin')
      .send({ city: null });

    expect(response.status).toBe(200);
    expect(modeloServicos.documents[0]?.city).toBeNull();
  });
});

describe('DELETE /api/public-utilities', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app).delete(
      '/api/public-utilities/000000000000000000000001',
    );

    expect(response.status).toBe(401);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .delete('/api/public-utilities/000000000000000000000001')
      .set('Authorization', 'Bearer token_comum');

    expect(response.status).toBe(403);
    expect(modeloServicos.documents).toHaveLength(3);
  });
});
