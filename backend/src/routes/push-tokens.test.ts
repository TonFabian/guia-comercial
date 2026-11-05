import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PushTokenModel } from '../models/push-token.model.js';
import { UserModel } from '../models/user.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');
vi.stubEnv('NOTIFY_SECRET', 'segredo_teste');

/** Sessões fake do Clerk: token -> clerkId. */
const { sessoes, fetchFake } = vi.hoisted(() => ({
  sessoes: new Map<string, string>([
    ['token_admin', 'user_admin'],
    ['token_comum', 'user_comum'],
    ['token_b', 'user_b'],
  ]),
  fetchFake: vi.fn(),
}));

vi.stubGlobal('fetch', fetchFake);

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

vi.mock('../models/push-token.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { PushTokenModel: criarModeloEmMemoria() };
});

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

vi.mock('../models/city.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CityModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloTokens = PushTokenModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

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

// Hooks únicos por arquivo: um `afterAll` com `unstubAllEnvs` dentro de um
// describe desstubava as envs antes dos describes seguintes (o broadcast caía
// em modo legado e respondia 401).
beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  modeloTokens.documents.length = 0;
  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((usuario) => ({ ...usuario })));
  fetchFake.mockReset();
});

// Nota sobre o status de payload inválido: o brief pede 400, mas o helper
// `validateBody` do repo devolve 422 (mesmo status já coberto pelos testes de
// events/tourist-spots/users). Aqui vale o padrão do repo: 422.
describe('POST /api/push-tokens — validação do body', () => {
  it('operador Mongo em token ({"token":{"$ne":null}}) → 422 (nunca 404/500)', async () => {
    const response = await request(app).post('/api/push-tokens').send({
      token: { $ne: null },
    });

    expect(response.status).toBe(422);
    expect(modeloTokens.documents).toHaveLength(0);
  });

  it('token numérico → 422', async () => {
    const response = await request(app).post('/api/push-tokens').send({ token: 123 });

    expect(response.status).toBe(422);
  });

  it('token vazio → 422', async () => {
    const response = await request(app).post('/api/push-tokens').send({ token: '' });

    expect(response.status).toBe(422);
  });

  it('token com 501 caracteres → 422', async () => {
    const response = await request(app)
      .post('/api/push-tokens')
      .send({ token: `ExponentPushToken[${'a'.repeat(501)}]` });

    expect(response.status).toBe(422);
  });

  it('token com espaço → 422', async () => {
    const response = await request(app)
      .post('/api/push-tokens')
      .send({ token: 'ExponentPushToken[a b]' });

    expect(response.status).toBe(422);
  });

  it('body sem token → 422', async () => {
    const response = await request(app).post('/api/push-tokens').send({});

    expect(response.status).toBe(422);
  });

  it('chave desconhecida no body (clerkId forjado) → 422 e não grava campo', async () => {
    const response = await request(app)
      .post('/api/push-tokens')
      .set('Authorization', 'Bearer token_comum')
      .send({ token: 'ExponentPushToken[valido]', clerkId: 'user_admin' });

    expect(response.status).toBe(200);
    expect(modeloTokens.documents[0]?.clerkId).toBe('user_comum');
  });
});

describe('POST /api/push-tokens — vínculo e anti-sequestro', () => {
  it('usuário registra token novo → 200 e grava com o clerkId da sessão', async () => {
    const response = await request(app)
      .post('/api/push-tokens')
      .set('Authorization', 'Bearer token_comum')
      .send({ token: 'ExponentPushToken[um]' });

    expect(response.status).toBe(200);
    expect(modeloTokens.documents).toHaveLength(1);
    expect(modeloTokens.documents[0]?.token).toBe('ExponentPushToken[um]');
    expect(modeloTokens.documents[0]?.clerkId).toBe('user_comum');
  });

  it('outro usuário registra o MESMO token → 409 e o dono não muda', async () => {
    await request(app)
      .post('/api/push-tokens')
      .set('Authorization', 'Bearer token_comum')
      .send({ token: 'ExponentPushToken[um]' });

    const response = await request(app)
      .post('/api/push-tokens')
      .set('Authorization', 'Bearer token_b')
      .send({ token: 'ExponentPushToken[um]' });

    expect(response.status).toBe(409);
    expect(modeloTokens.documents).toHaveLength(1);
    expect(modeloTokens.documents[0]?.clerkId).toBe('user_comum');
  });

  it('mesmo usuário registra de novo → 200 idempotente (um único documento)', async () => {
    await request(app)
      .post('/api/push-tokens')
      .set('Authorization', 'Bearer token_comum')
      .send({ token: 'ExponentPushToken[um]' });

    const response = await request(app)
      .post('/api/push-tokens')
      .set('Authorization', 'Bearer token_comum')
      .send({ token: 'ExponentPushToken[um]' });

    expect(response.status).toBe(200);
    expect(modeloTokens.documents).toHaveLength(1);
    expect(modeloTokens.documents[0]?.clerkId).toBe('user_comum');
  });

  it('convidado (sem sessão) registra token novo → 200 sem clerkId', async () => {
    const response = await request(app).post('/api/push-tokens').send({ token: 'ExponentPushToken[conv]' });

    expect(response.status).toBe(200);
    expect(modeloTokens.documents).toHaveLength(1);
    expect(modeloTokens.documents[0]?.clerkId).toBeUndefined();
  });

  it('convidado registra token já vinculado a usuário → 409', async () => {
    await request(app)
      .post('/api/push-tokens')
      .set('Authorization', 'Bearer token_comum')
      .send({ token: 'ExponentPushToken[um]' });

    const response = await request(app).post('/api/push-tokens').send({ token: 'ExponentPushToken[um]' });

    expect(response.status).toBe(409);
    expect(modeloTokens.documents).toHaveLength(1);
    expect(modeloTokens.documents[0]?.clerkId).toBe('user_comum');
  });

  it('token de convidado adotado por uma sessão nova → 200 e vincula ao clerk', async () => {
    await request(app).post('/api/push-tokens').send({ token: 'ExponentPushToken[conv]' });

    const response = await request(app)
      .post('/api/push-tokens')
      .set('Authorization', 'Bearer token_comum')
      .send({ token: 'ExponentPushToken[conv]' });

    expect(response.status).toBe(200);
    expect(modeloTokens.documents).toHaveLength(1);
    expect(modeloTokens.documents[0]?.clerkId).toBe('user_comum');
  });
});

describe('POST /api/notifications/broadcast', () => {
  it('title ausente → 422', async () => {
    const response = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', 'Bearer token_admin')
      .set('x-notify-secret', 'segredo_teste')
      .send({ body: 'Texto' });

    expect(response.status).toBe(422);
  });

  it('title com 121 caracteres → 422', async () => {
    const response = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', 'Bearer token_admin')
      .set('x-notify-secret', 'segredo_teste')
      .send({ title: 't'.repeat(121), body: 'Texto' });

    expect(response.status).toBe(422);
  });

  it('body com 501 caracteres → 422', async () => {
    const response = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', 'Bearer token_admin')
      .set('x-notify-secret', 'segredo_teste')
      .send({ title: 'Título', body: 'b'.repeat(501) });

    expect(response.status).toBe(422);
  });

  it('broadcast sem sessão → 401 (fail-closed antes de usar title/body)', async () => {
    const response = await request(app)
      .post('/api/notifications/broadcast')
      .set('x-notify-secret', 'segredo_teste')
      .send({ title: 'Título', body: 'Texto' });

    expect(response.status).toBe(401);
    expect(fetchFake).not.toHaveBeenCalled();
  });

  it('broadcast com usuário comum → 403 (apenas admin)', async () => {
    const response = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', 'Bearer token_comum')
      .set('x-notify-secret', 'segredo_teste')
      .send({ title: 'Título', body: 'Texto' });

    expect(response.status).toBe(403);
    expect(fetchFake).not.toHaveBeenCalled();
  });

  it('broadcast com NOTIFY_SECRET errada → 403', async () => {
    const response = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', 'Bearer token_admin')
      .set('x-notify-secret', 'errada')
      .send({ title: 'Título', body: 'Texto' });

    expect(response.status).toBe(403);
    expect(fetchFake).not.toHaveBeenCalled();
  });

  it('broadcast com admin e secret correta → envia aos tokens registrados', async () => {
    modeloTokens.documents.push({
      _id: '000000000000000000000040',
      token: 'ExponentPushToken[teste1]',
      clerkId: 'user_comum',
    });
    fetchFake.mockResolvedValue({ json: async () => ({ data: [{ status: 'ok' }] }) });

    const response = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', 'Bearer token_admin')
      .set('x-notify-secret', 'segredo_teste')
      .send({ title: 'Título', body: 'Texto' });

    expect(response.status).toBe(200);
    expect(response.body.sent).toBe(1);
    expect(fetchFake).toHaveBeenCalledTimes(1);
    const corpo = JSON.parse(String(fetchFake.mock.calls[0]?.[1]?.body)) as Array<{
      to: string;
      title: string;
      body: string;
    }>;
    expect(corpo[0]?.to).toBe('ExponentPushToken[teste1]');
    expect(corpo[0]?.title).toBe('Título');
  });
});
