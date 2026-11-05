import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticeModel } from '../models/notice.model.js';
import { UserModel } from '../models/user.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

/** Sessões fake do Clerk: token -> clerkId (usuário comum incluído para 403). */
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

vi.mock('../models/notice.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { NoticeModel: criarModeloEmMemoria() };
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

const modeloAvisos = NoticeModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

/** Janelas relativas a agora: prova que o filtro vigente compara datas. */
const expiresAtVencido = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const avisosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000060',
    title: 'Feira seria adiada',
    body: 'A feira foi adiada para o próximo sábado.',
    active: true,
  },
  {
    _id: '000000000000000000000061',
    title: 'Rascunho interno',
    body: 'Aviso ainda não publicado.',
    active: false,
  },
  {
    _id: '000000000000000000000062',
    title: 'Aviso vencido',
    body: 'Publicou, ativo, mas a janela de datas já passou.',
    active: true,
    expiresAt: expiresAtVencido,
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
  modeloAvisos.documents.length = 0;
  modeloAvisos.documents.push(...avisosFake.map((aviso) => ({ ...aviso })));

  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((usuario) => ({ ...usuario })));
});

describe('GET /api/notices', () => {
  it('default fail-closed: sem `active` devolve só avisos ativos e vigentes', async () => {
    const response = await request(app).get('/api/notices');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].title).toBe('Feira seria adiada');

    // Rascunho e vencido devolvem MAIS dados do que o público pode ver.
    const corpo = JSON.stringify(response.body);
    expect(corpo).not.toContain('Rascunho interno');
    expect(corpo).not.toContain('Aviso vencido');
  });

  it('responde no shape Paginated', async () => {
    const response = await request(app).get('/api/notices?active=true');

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.total).toBe(1);
  });

  it('?active=true traz apenas avisos ativos e vigentes (vencido fora)', async () => {
    const response = await request(app).get('/api/notices?active=true');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].title).toBe('Feira seria adiada');

    const corpo = JSON.stringify(response.body);
    expect(corpo).not.toContain('Aviso vencido');
  });

  it('?active=false sem sessão → 401 e nenhum rascunho', async () => {
    const response = await request(app).get('/api/notices?active=false');

    expect(response.status).toBe(401);
    expect(JSON.stringify(response.body)).not.toContain('Rascunho interno');
  });

  it('?active=false com usuário comum → 403', async () => {
    const response = await request(app)
      .get('/api/notices?active=false')
      .set('Authorization', 'Bearer token_comum');

    expect(response.status).toBe(403);
  });

  it('?active=false com admin → só os rascunhos', async () => {
    const response = await request(app)
      .get('/api/notices?active=false')
      .set('Authorization', 'Bearer token_admin');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].title).toBe('Rascunho interno');
    expect(JSON.stringify(response.body)).not.toContain('Feira seria adiada');
  });

  it('?active=all sem sessão → 401', async () => {
    const response = await request(app).get('/api/notices?active=all');

    expect(response.status).toBe(401);
  });

  it('?active=all com usuário comum → 403', async () => {
    const response = await request(app)
      .get('/api/notices?active=all')
      .set('Authorization', 'Bearer token_comum');

    expect(response.status).toBe(403);
  });

  it('?active=all com admin → todos (ativo, rascunho e vencido)', async () => {
    const response = await request(app)
      .get('/api/notices?active=all')
      .set('Authorization', 'Bearer token_admin');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    const titulos = response.body.items.map((aviso: { title: string }) => aviso.title);
    expect(titulos).toContain('Feira seria adiada');
    expect(titulos).toContain('Rascunho interno');
    expect(titulos).toContain('Aviso vencido');
  });

  it('active fora de true/false/all → 400 (antes era ignorado silenciosamente)', async () => {
    const response = await request(app).get('/api/notices?active=banana');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'active'");
  });

  it('active repetido (?active=true&active=false) → 400 nomeado', async () => {
    const response = await request(app).get('/api/notices?active=true&active=false');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'active'");
  });

  it('id malformado → 404 (antes dependia do CastError do Mongoose)', async () => {
    const response = await request(app).get('/api/notices/abc');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('aviso não encontrado');
  });
});

describe('PUT/DELETE /api/notices com id malformado', () => {
  it('PUT com id malformado → 404', async () => {
    const response = await request(app)
      .put('/api/notices/xyz')
      .set('Authorization', 'Bearer token_admin')
      .send({ title: 'Novo título' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('aviso não encontrado');
  });

  it('DELETE com id malformado → 404', async () => {
    const response = await request(app)
      .delete('/api/notices/xyz')
      .set('Authorization', 'Bearer token_admin');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('aviso não encontrado');
  });
});
