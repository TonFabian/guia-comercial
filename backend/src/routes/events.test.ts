import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TourEventModel } from '../models/event.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { UserModel } from '../models/user.model.js';
import { PushTokenModel } from '../models/push-token.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

/** Sessões fake do Clerk: token -> clerkId. */
const { sessoes, fetchFake } = vi.hoisted(() => ({
  sessoes: new Map<string, string>([
    ['token_admin', 'user_admin'],
    ['token_comum', 'user_comum'],
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

vi.mock('../models/event.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { TourEventModel: criarModeloEmMemoria() };
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

vi.mock('../models/push-token.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { PushTokenModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloEventos = TourEventModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;
const modeloTokens = PushTokenModel as unknown as MemoryModel;

// Relógio fixo: 12:00Z de 05/11/2026 = 09:00 de Fortaleza (UTC-3), logo
// "hoje" no backend é 2026-11-05.
const hoje = '2026-11-05';
const ontem = '2026-11-04';
const amanha = '2026-11-06';

const eventosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000001',
    name: 'Festival do Peão',
    slug: 'festival-do-peao',
    description: 'Três dias de festa já iniciada',
    category: 'festival',
    startDate: '2026-11-03',
    endDate: hoje, // encerra HOJE: ainda visível
    city: '000000000000000000000020',
    ticket: 'free', // ingresso isento, sem preço — PUT para 'paid' deve falhar (422)
    active: true,
  },
  {
    _id: '000000000000000000000002',
    name: 'Feira da Colheita',
    slug: 'feira-da-colheita',
    description: 'Evento encerrado ontem',
    category: 'fair',
    startDate: '2026-11-01',
    endDate: ontem, // vencido
    city: null,
    active: true,
  },
  {
    _id: '000000000000000000000003',
    name: 'Show da Praça',
    slug: 'show-da-praca',
    description: 'Evento com início no futuro',
    category: 'show',
    startDate: amanha, // começa depois de hoje: ainda visível ("em breve")
    endDate: '2026-11-08',
    city: '000000000000000000000021',
    active: true,
  },
  {
    _id: '000000000000000000000004',
    name: 'Encontro Cultural',
    slug: 'encontro-cultural',
    description: 'Rascunho com ingresso pago e preço salvo',
    category: 'cultural',
    startDate: '2026-11-07',
    endDate: '2026-11-09',
    city: null,
    ticket: 'paid',
    ticketPrice: 'R$ 25,00',
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
    description: 'Empresa organizadora do evento',
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

const tokensFake: MemoryDocument[] = [
  { _id: '000000000000000000000040', token: 'ExponentPushToken[teste1]' },
];

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

beforeEach(() => {
  modeloEventos.documents.length = 0;
  modeloEventos.documents.push(...eventosFake.map((evento) => ({ ...evento })));

  modeloCidades.documents.length = 0;
  modeloCidades.documents.push(...cidadesFake.map((cidade) => ({ ...cidade })));

  modeloEmpresas.documents.length = 0;
  modeloEmpresas.documents.push(...empresasFake.map((empresa) => ({ ...empresa })));

  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push(...usuariosFake.map((usuario) => ({ ...usuario })));

  modeloTokens.documents.length = 0;
  modeloTokens.documents.push(...tokensFake.map((token) => ({ ...token })));

  fetchFake.mockReset();
  fetchFake.mockResolvedValue({ ok: true, status: 200 });

  vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
});

describe('GET /api/events', () => {
  it('responde a página paginada no shape Paginated, sem eventos vencidos', async () => {
    // Relógio fixo em 2026-11-05: a listagem padrão traz o evento que encerra
    // HOJE, o que começa no FUTURO e o rascunho futuro — e exclui o vencido.
    const response = await request(app).get('/api/events');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.items).toHaveLength(3);
    const slugs = response.body.items.map((item: { slug: string }) => item.slug);
    expect(slugs).toContain('festival-do-peao');
    expect(slugs).toContain('show-da-praca');
    expect(slugs).toContain('encontro-cultural');
    expect(slugs).not.toContain('feira-da-colheita');
  });

  it('filtra os eventos pela categoria informada', async () => {
    const response = await request(app).get('/api/events?category=festival');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Festival do Peão');
  });

  it('filtra rascunhos com o flag active=false', async () => {
    const response = await request(app).get('/api/events?active=false');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Encontro Cultural');
  });

  it('filtra os eventos pela cidade informada (slug)', async () => {
    const response = await request(app).get('/api/events?city=castelo-do-piaui');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Festival do Peão');
  });

  it('esconde o evento vencido: ?active=true não traz endDate de ontem', async () => {
    const response = await request(app).get('/api/events?active=true');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    const slugs = response.body.items.map((item: { slug: string }) => item.slug);
    expect(slugs).toContain('festival-do-peao');
    expect(slugs).toContain('show-da-praca');
    expect(slugs).not.toContain('feira-da-colheita');
  });

  it('?includePast=true traz o evento vencido', async () => {
    const response = await request(app).get('/api/events?active=true&includePast=true');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    const slugs = response.body.items.map((item: { slug: string }) => item.slug);
    expect(slugs).toContain('feira-da-colheita');
  });

  it('responde 404 para id malformado', async () => {
    const response = await request(app).get('/api/events/nao-e-um-object-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('id inválido');
  });

  it('responde 200 com o objeto completo para evento vencido por GET /:id', async () => {
    // A tela exibe "Encerrado": o vencido continua recuperável por id.
    const response = await request(app).get('/api/events/000000000000000000000002');

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Feira da Colheita');
    expect(response.body.endDate).toBe(ontem);
  });
});

describe('POST /api/events', () => {
  const payloadValido = {
    name: 'Festival do Café',
    slug: 'festival-do-cafe',
    description: 'Festival gastronômico do café',
    category: 'festival',
    startDate: '2026-12-10',
    endDate: '2026-12-15',
    active: true,
    city: 'castelo-do-piaui',
    organizerCompany: 'parque-municipal',
  };

  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app).post('/api/events').send(payloadValido);

    expect(response.status).toBe(401);
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_comum')
      .send(payloadValido);

    expect(response.status).toBe(403);
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('cria o evento quando a sessão é de admin', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send(payloadValido);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Festival do Café');
    expect(modeloEventos.documents).toHaveLength(5);
    // `city` e `organizerCompany` (dado por slug) viram referência de ObjectId.
    expect(modeloEventos.documents[4]?.city).toBe('000000000000000000000020');
    expect(modeloEventos.documents[4]?.organizerCompany).toBe('000000000000000000000030');
  });

  it('dispara EXATAMENTE UMA notificação push ao criar', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send(payloadValido);

    expect(response.status).toBe(201);
    await vi.waitFor(() => expect(fetchFake).toHaveBeenCalledTimes(1));
    const [url, init] = fetchFake.mock.calls[0] as [string, { body: string }];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(JSON.parse(init.body)).toHaveLength(1);
  });

  it('cria o evento mesmo quando o push falha', async () => {
    fetchFake.mockRejectedValue(new Error('falha no push'));

    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send(payloadValido);

    expect(response.status).toBe(201);
    expect(modeloEventos.documents).toHaveLength(5);
    await vi.waitFor(() => expect(fetchFake).toHaveBeenCalled());
  });

  it('responde 422 para payload sem campos obrigatórios', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Sem demais campos' });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Payload inválido');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('responde 422 quando endDate é anterior a startDate', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send({ ...payloadValido, startDate: '2026-12-15', endDate: '2026-12-10' });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('endDate');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('responde 422 quando o ingresso é pago sem o preço', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send({ ...payloadValido, ticket: 'paid' });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('ticketPrice');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('responde 422 para horário fora do formato HH:mm', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send({ ...payloadValido, startTime: '25:00' });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('startTime');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('responde 409 para slug já utilizado', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send({ ...payloadValido, slug: 'festival-do-peao' });

    expect(response.status).toBe(409);
    expect(modeloEventos.documents).toHaveLength(4);
  });
});

describe('PUT /api/events', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app)
      .put('/api/events/000000000000000000000001')
      .send({ name: 'Outro nome' });

    expect(response.status).toBe(401);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .put('/api/events/000000000000000000000001')
      .set('Authorization', 'Bearer token_comum')
      .send({ name: 'Outro nome' });

    expect(response.status).toBe(403);
    expect(modeloEventos.documents[0]?.name).toBe('Festival do Peão');
  });

  it('responde 422 quando o PUT deixa o ingresso pago sem preço', async () => {
    // Doc 1 tem ticket 'free' sem preço: o payload só troca para 'paid' — a
    // invariante vale sobre o estado resultante (ticketPrice undefined).
    const response = await request(app)
      .put('/api/events/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin')
      .send({ ticket: 'paid' });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body)).toContain('ticketPrice');
    expect(modeloEventos.documents[0]?.ticket).toBe('free');
  });

  it('responde 422 quando o PUT deixa endDate antes do startDate já salvo', async () => {
    // Doc 2 tem startDate 2026-11-01; o payload só adianta o endDate para
    // antes do início: a invariante vale sobre o estado resultante.
    const response = await request(app)
      .put('/api/events/000000000000000000000002')
      .set('Authorization', 'Bearer token_admin')
      .send({ endDate: '2026-10-30' });

    expect(response.status).toBe(422);
    expect(modeloEventos.documents[1]?.endDate).toBe(ontem);
  });

  it('mantém o ingresso pago com preço já salvo quando o PUT não manda ticket', async () => {
    // Doc 4 já tem ticket 'paid' + ticketPrice salvos: um PUT que só troca o
    // nome não pode ser barrado pela invariante.
    const response = await request(app)
      .put('/api/events/000000000000000000000004')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Encontro Cultural Atualizado' });

    expect(response.status).toBe(200);
    expect(modeloEventos.documents[3]?.name).toBe('Encontro Cultural Atualizado');
    expect(modeloEventos.documents[3]?.ticketPrice).toBe('R$ 25,00');
  });

  it('atualiza o evento quando a sessão é de admin', async () => {
    const response = await request(app)
      .put('/api/events/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Festival do Peão Atualizado', description: 'Novo texto' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Festival do Peão Atualizado');
    expect(modeloEventos.documents[0]?.name).toBe('Festival do Peão Atualizado');
    expect(modeloEventos.documents[0]?.description).toBe('Novo texto');
  });

  it('não dispara push ao atualizar', async () => {
    await request(app)
      .put('/api/events/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Festival do Peão Atualizado' });

    expect(fetchFake).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/events', () => {
  it('responde 401 sem sessão autenticada', async () => {
    const response = await request(app).delete('/api/events/000000000000000000000001');

    expect(response.status).toBe(401);
  });

  it('responde 403 para usuário comum', async () => {
    const response = await request(app)
      .delete('/api/events/000000000000000000000001')
      .set('Authorization', 'Bearer token_comum');

    expect(response.status).toBe(403);
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('remove o evento quando a sessão é de admin', async () => {
    const response = await request(app)
      .delete('/api/events/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin');

    expect(response.status).toBe(204);
    expect(modeloEventos.documents).toHaveLength(3);
  });

  it('não dispara push ao remover', async () => {
    await request(app)
      .delete('/api/events/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin');

    expect(fetchFake).not.toHaveBeenCalled();
  });
});
