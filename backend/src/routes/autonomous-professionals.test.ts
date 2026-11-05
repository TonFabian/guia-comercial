import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AutonomousProfessionalModel } from '../models/autonomous-professional.model.js';
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

vi.mock('../models/autonomous-professional.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { AutonomousProfessionalModel: criarModeloEmMemoria() };
});

// O espelho do usuário autenticado resolve a cidade default (upsert no login).
vi.mock('../models/city.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CityModel: criarModeloEmMemoria() };
});

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloProfissionais = AutonomousProfessionalModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

const profissionaisFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000060',
    name: 'João Pintor',
    slug: 'joao-pintor',
    specialty: 'Pintura',
    ownerClerkId: 'user_comum',
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
  modeloProfissionais.documents.length = 0;
  modeloProfissionais.documents.push(...profissionaisFake.map((profissional) => ({ ...profissional })));

  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((usuario) => ({ ...usuario })));
});

const payloadValido = {
  name: 'Ana Eletricista',
  slug: 'ana-eletricista',
  specialty: 'Elétrica',
};

describe('POST /api/autonomous-professionals', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app).post('/api/autonomous-professionals').send(payloadValido);

    expect(response.status).toBe(401);
    expect(modeloProfissionais.documents).toHaveLength(1);
  });

  it('ignora o ownerClerkId do payload: o dono é o clerk da sessão', async () => {
    const response = await request(app)
      .post('/api/autonomous-professionals')
      .set('Authorization', 'Bearer token_comum')
      .send({ ...payloadValido, ownerClerkId: 'user_admin' });

    expect(response.status).toBe(201);
    expect(response.body.ownerClerkId).toBe('user_comum');
  });

  it('id malformado no GET → 404 (antes dependia do CastError do Mongoose)', async () => {
    const response = await request(app).get('/api/autonomous-professionals/xyz');

    expect(response.status).toBe(404);
  });
});

describe('PUT/DELETE /api/autonomous-professionals', () => {
  it('PUT não troca o dono: ownerClerkId do payload é descartado', async () => {
    const response = await request(app)
      .put('/api/autonomous-professionals/000000000000000000000060')
      .set('Authorization', 'Bearer token_comum')
      .send({ ownerClerkId: 'user_admin', specialty: 'Pintura e textura' });

    expect(response.status).toBe(200);
    expect(modeloProfissionais.documents[0]?.ownerClerkId).toBe('user_comum');
    expect(modeloProfissionais.documents[0]?.specialty).toBe('Pintura e textura');
  });

  it('PUT com id malformado → 404', async () => {
    const response = await request(app)
      .put('/api/autonomous-professionals/xyz')
      .set('Authorization', 'Bearer token_comum')
      .send({ specialty: 'X' });

    expect(response.status).toBe(404);
  });

  it('DELETE com id malformado → 404', async () => {
    const response = await request(app)
      .delete('/api/autonomous-professionals/xyz')
      .set('Authorization', 'Bearer token_comum');

    expect(response.status).toBe(404);
    expect(modeloProfissionais.documents).toHaveLength(1);
  });
});
