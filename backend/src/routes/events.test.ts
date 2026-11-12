import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TourEventModel } from '../models/event.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { TouristSpotModel } from '../models/tourist-spot.model.js';
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

// Model de pontos turísticos entra no fluxo do service de eventos: a referência
// de atrativo da programação (`schedule[].relatedSpot`) é resolvida por id/slug
// contra a coleção de TouristSpot — sem o fake, a query real ficaria em
// buffering sem conexão e travaria o teste.
vi.mock('../models/tourist-spot.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { TouristSpotModel: criarModeloEmMemoria() };
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
const modeloPontos = TouristSpotModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;
const modeloTokens = PushTokenModel as unknown as MemoryModel;

// Relógio fixo: 12:00Z de 05/11/2026 = 09:00 de Brasília (UTC-3), logo
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

// Atrativo turístico referenciado pela programação (`schedule[].relatedSpot`
// por slug): o service resolve para o id do documento TouristSpot.
const atrativosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000050',
    name: 'Cânion do Poti',
    slug: 'parque-municipal',
    category: 'other',
    active: true,
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

  modeloPontos.documents.length = 0;
  modeloPontos.documents.push(...atrativosFake.map((atrativo) => ({ ...atrativo })));

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

  it('filtra os eventos pela busca textual no nome (?q=)', async () => {
    // Case-insensitive: o termo em caixa alta casa com "Festival do Peão".
    const response = await request(app).get(`/api/events?q=${encodeURIComponent('FESTIVAL')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Festival do Peão');
  });

  it('filtra os eventos pela busca textual na descrição (?q=)', async () => {
    const response = await request(app).get(`/api/events?q=${encodeURIComponent('início no futuro')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Show da Praça');
  });

  it('filtra os eventos pela busca textual no local (?q=)', async () => {
    // Fixture extra (só neste teste): evento vigente com location salvo —
    // nenhum doc do conjunto base tem esse campo.
    modeloEventos.documents.push({
      _id: '000000000000000000000005',
      name: 'Feira de Artesanato',
      slug: 'feira-de-artesanato',
      description: 'Peças manuais e regionais',
      category: 'fair',
      startDate: '2026-11-07',
      endDate: '2026-11-08',
      location: 'Cânion do Poti',
      active: true,
    });

    const response = await request(app).get(`/api/events?q=${encodeURIComponent('cânion do poti')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Feira de Artesanato');
  });

  it('devolve lista vazia quando a busca não casa nada (?q=)', async () => {
    const response = await request(app).get(`/api/events?q=${encodeURIComponent('palavra-que-nao-existe')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect(response.body.items).toHaveLength(0);
  });

  it('não filtra quando a busca vem vazia (?q=)', async () => {
    const response = await request(app).get('/api/events?q=');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items).toHaveLength(3);
  });

  it('o total da busca (?q=) reflete o resultado filtrado, não a coleção', async () => {
    // pageSize=1 limita a página, mas o total continua sendo 1: só um evento
    // vigente casa o termo pela descrição ("festa já iniciada").
    const response = await request(app)
      .get(`/api/events?q=${encodeURIComponent('festa')}&page=1&pageSize=1`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].name).toBe('Festival do Peão');
  });

  it('não derruba a consulta quando a busca traz caractere especial (?q=)', async () => {
    // `show(` sem escape estouraria SyntaxError em new RegExp (→ 500);
    // a regex é escapada e o termo literal simplesmente não casa.
    const response = await request(app).get(`/api/events?q=${encodeURIComponent('show(')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect(response.body.items).toHaveLength(0);
  });

  it('a busca (?q=) continua respeitando a vigência dos eventos', async () => {
    // "Feira da Colheita" casa o termo, mas está vencida: sem includePast
    // não aparece, e com includePast=true ela volta.
    const semVencido = await request(app).get(`/api/events?q=${encodeURIComponent('colheita')}`);

    expect(semVencido.status).toBe(200);
    expect(semVencido.body.total).toBe(0);
    expect(semVencido.body.items).toHaveLength(0);

    const comVencido = await request(app)
      .get(`/api/events?q=${encodeURIComponent('colheita')}&includePast=true`);

    expect(comVencido.status).toBe(200);
    expect(comVencido.body.total).toBe(1);
    expect(comVencido.body.items[0].name).toBe('Feira da Colheita');
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

  it('redige os contatos do evento para o convidado (sem Authorization)', async () => {
    // Fixture extra (só neste teste): evento com contato comercial e empresa
    // organizadora JÁ POPULADA — os demais testes partem do reset do
    // beforeEach, que restaura o conjunto base sem este documento.
    modeloEventos.documents.push({
      _id: '000000000000000000000005',
      name: 'Expo Turismo',
      slug: 'expo-turismo',
      description: 'Feira regional de turismo',
      category: 'exhibition',
      startDate: '2026-11-06',
      endDate: '2026-11-08',
      address: 'Recinto de exposições, s/n',
      phone: '+5584995556666',
      whatsapp: '+5584995556666',
      ticket: 'paid',
      ticketPrice: 'R$ 30,00',
      ticketUrl: 'https://ingressos.example.com/expo',
      website: 'https://expoturismo.example.com',
      active: true,
      organizerCompany: {
        _id: '000000000000000000000030',
        name: 'Parque Municipal',
        slug: 'parque-municipal',
        description: 'Empresa organizadora do evento',
        category: 'entretenimento',
        phone: '+5584997778888',
        whatsapp: '+5584997778888',
        address: 'Av. Central, 500',
      },
    });

    const response = await request(app).get('/api/events?category=exhibition');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    const evento = response.body.items[0];
    expect(evento.slug).toBe('expo-turismo');
    expect(evento.phone).toBeNull();
    expect(evento.whatsapp).toBeNull();
    // O endereço do evento é público (spec D14): preservado para o convidado.
    expect(evento.address).toBe('Recinto de exposições, s/n');
    expect(evento.ticketUrl).toBe('https://ingressos.example.com/expo');
    expect(evento.ticketPrice).toBe('R$ 30,00');
    // A empresa organizadora NÃO pode burlar a redação com o contato comercial.
    expect(evento.organizerCompany.phone).toBeNull();
    expect(evento.organizerCompany.whatsapp).toBeNull();
    expect(evento.organizerCompany.address).toBeNull();
    expect(evento.organizerCompany.name).toBe('Parque Municipal');
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

  it('não dispara push ao criar evento rascunho (active=false)', async () => {
    // Rascunho é invisível no app: anunciar "novo evento" de algo encoberto
    // seria push irrecuperável para toda a base de tokens.
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send({ ...payloadValido, active: false });

    expect(response.status).toBe(201);
    expect(modeloEventos.documents).toHaveLength(5);
    // O disparo de push é async pós-create: alguns ciclos de microtarefas
    // garantem que um disparo indevido já teria sido registrado.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchFake).not.toHaveBeenCalled();
  });

  it('não dispara push ao criar evento já vencido (backfill histórico)', async () => {
    // Backfill de evento que já acabou: endDate/startDate no passado andam
    // aceitos no cadastro, mas anunciar evento encerrado é ruído irreversível.
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send({
        ...payloadValido,
        startDate: '2026-11-01',
        endDate: ontem, // vencido em relação ao relógio fixo (2026-11-05)
      });

    expect(response.status).toBe(201);
    expect(modeloEventos.documents).toHaveLength(5);
    // Espera um ciclo de microtarefas para pegar o disparo assíncrono, se houver.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchFake).not.toHaveBeenCalled();
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

describe('POST /api/events — programação (schedule)', () => {
  // Intervalo do evento: os itens da programação têm de caber nele (bordas
  // inclusas). O `schedule` é array de itens embutidos no próprio evento.
  const payloadBase = {
    name: 'Canyon Fest Poti',
    slug: 'canyon-fest-poti',
    description: 'Três dias de festival no cânion do Poti',
    category: 'festival',
    startDate: '2026-12-10',
    endDate: '2026-12-12',
    active: true,
  };

  const itemCompleto = {
    date: '2026-12-10',
    startTime: '09:00',
    endTime: '12:30',
    title: 'Trilha guiada no cânion',
    description: 'Caminhada guiada pelo cânion com guia local',
    stage: 'Praça Central',
    relatedSpot: 'parque-municipal',
    ticket: 'paid',
    ticketPrice: 'R$ 15,00',
    ticketUrl: 'https://ingressos.example.com/canyon-fest',
  };

  const publicar = async (payload: Record<string, unknown>) =>
    request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer token_admin')
      .send(payload);

  it('aceita o evento com item completo de programação e devolve o item na resposta', async () => {
    const response = await publicar({ ...payloadBase, schedule: [itemCompleto] });

    expect(response.status).toBe(201);
    expect(response.body.schedule).toHaveLength(1);
    const item = response.body.schedule[0] as Record<string, unknown>;
    expect(item.date).toBe('2026-12-10');
    expect(item.startTime).toBe('09:00');
    expect(item.endTime).toBe('12:30');
    expect(item.title).toBe('Trilha guiada no cânion');
    expect(item.stage).toBe('Praça Central');
    // O service resolve `relatedSpot` (id/slug) para o id de TouristSpot, como
    // faz com `organizerCompany` — a resposta já carrega a referência resolvida.
    expect(item.relatedSpot).toBe('000000000000000000000050');
    expect(item.ticket).toBe('paid');
    expect(item.ticketPrice).toBe('R$ 15,00');
    expect(modeloEventos.documents).toHaveLength(5);
  });

  it('responde 422 quando a date do item sai do intervalo do evento', async () => {
    // endDate é 2026-12-12: um item do dia 13 descarrila a programação.
    const response = await publicar({
      ...payloadBase,
      schedule: [{ ...itemCompleto, date: '2026-12-13' }],
    });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Payload inválido');
    expect(JSON.stringify(response.body.details)).toContain('schedule');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('aceita item na borda: date igual a startDate e date igual a endDate', async () => {
    // As bordas são dias do evento: início (2026-12-10) e fechamento (2026-12-12)
    // são programação válida.
    const primeiroDia = await publicar({ ...payloadBase, schedule: [itemCompleto] });

    expect(primeiroDia.status).toBe(201);
    expect(primeiroDia.body.schedule[0].date).toBe('2026-12-10');

    const ultimoDia = await publicar({
      ...payloadBase,
      slug: 'canyon-fest-poti-2',
      schedule: [{ ...itemCompleto, date: '2026-12-12' }],
    });

    expect(ultimoDia.status).toBe(201);
    expect(ultimoDia.body.schedule[0].date).toBe('2026-12-12');
  });

  it('responde 422 quando o endTime do item é anterior ao startTime', async () => {
    const response = await publicar({
      ...payloadBase,
      schedule: [{ ...itemCompleto, endTime: '08:00' }],
    });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('endTime');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('responde 422 quando o item é pago e não informa o preço', async () => {
    // Mesma programação, sem o ticketPrice: o preço é obrigatório no item pago.
    const itemSemPreco = {
      date: itemCompleto.date,
      startTime: itemCompleto.startTime,
      endTime: itemCompleto.endTime,
      title: itemCompleto.title,
      description: itemCompleto.description,
      stage: itemCompleto.stage,
      relatedSpot: itemCompleto.relatedSpot,
      ticket: itemCompleto.ticket,
      ticketUrl: itemCompleto.ticketUrl,
    };
    const response = await publicar({ ...payloadBase, schedule: [itemSemPreco] });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('ticketPrice');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('responde 422 quando a date do item não é uma data válida', async () => {
    // '12-31-2026' tem o formato invertido (MM-DD-YYYY): nem passa do formato
    // YYYY-MM-DD, quanto menos da checagem do calendário.
    const response = await publicar({
      ...payloadBase,
      schedule: [{ ...itemCompleto, date: '12-31-2026' }],
    });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('schedule');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('responde 422 quando o item referencia uma atração que não existe', async () => {
    // Slug vem do banco: um slug desconhecido é erro de digitação e não pode
    // ser salvo em silêncio (o item perderia o link sem o admin perceber).
    const response = await publicar({
      ...payloadBase,
      schedule: [{ ...itemCompleto, relatedSpot: 'atracao-que-nao-existe' }],
    });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body)).toContain('atrativo');
    expect(modeloEventos.documents).toHaveLength(4);
  });

  it('mantém a referência por id quando a atração não existe mais', async () => {
    // Id é opaco: a atração pode ter sido removida do catálogo e o item
    // continua válido (o id fica, o app só não desenha o link).
    const response = await publicar({
      ...payloadBase,
      schedule: [{ ...itemCompleto, relatedSpot: '000000000000000000000099' }],
    });

    expect(response.status).toBe(201);
    const item = response.body.schedule[0] as Record<string, unknown>;
    expect(item.relatedSpot).toBe('000000000000000000000099');
  });

  it('responde 422 quando a programação tem mais de 100 itens', async () => {
    const response = await publicar({
      ...payloadBase,
      schedule: Array.from({ length: 101 }, (_, indice) => ({
        ...itemCompleto,
        date: '2026-12-10',
        title: `Item ${indice}`,
      })),
    });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('schedule');
    expect(modeloEventos.documents).toHaveLength(4);
  });
});

describe('PUT /api/events — programação (schedule)', () => {
  // Doc 4 ("Encontro Cultural"): startDate 2026-11-07, endDate 2026-11-09.
  // O PUT parcial NÃO traz as datas do evento — a vigência dos itens vale
  // sobre o intervalo já salvo.
  const itemCompleto = {
    date: '2026-11-08',
    startTime: '09:00',
    endTime: '12:30',
    title: 'Trilha guiada no cânion',
    description: 'Caminhada guiada pelo cânion com guia local',
    stage: 'Praça Central',
    relatedSpot: 'parque-municipal',
    ticket: 'paid',
    ticketPrice: 'R$ 15,00',
    ticketUrl: 'https://ingressos.example.com/canyon-fest',
  };

  const atualizar = async (payload: Record<string, unknown>) =>
    request(app)
      .put('/api/events/000000000000000000000004')
      .set('Authorization', 'Bearer token_admin')
      .send(payload);

  it('atualiza a programação do evento e resolve a referência da atração', async () => {
    const response = await atualizar({ schedule: [itemCompleto] });

    expect(response.status).toBe(200);
    expect(response.body.schedule).toHaveLength(1);
    const item = response.body.schedule[0] as Record<string, unknown>;
    expect(item.date).toBe('2026-11-08');
    expect(item.stage).toBe('Praça Central');
    // O service resolve `relatedSpot` (id/slug) para o id de TouristSpot.
    expect(item.relatedSpot).toBe('000000000000000000000050');
    const salvo = modeloEventos.documents[3]?.schedule as Record<string, unknown>[];
    expect(salvo).toHaveLength(1);
    expect(salvo[0]?.date).toBe('2026-11-08');
  });

  it('aceita item na borda do intervalo já salvo (startDate e endDate)', async () => {
    const primeiroDia = await atualizar({
      schedule: [{ ...itemCompleto, date: '2026-11-07' }],
    });
    expect(primeiroDia.status).toBe(200);

    const ultimoDia = await atualizar({
      schedule: [{ ...itemCompleto, date: '2026-11-09' }],
    });
    expect(ultimoDia.status).toBe(200);
  });

  it('responde 422 quando a data do item sai do intervalo do evento já salvo', async () => {
    // O intervalo salvo é 2026-11-07 .. 2026-11-09: um item do dia 20 não
    // cabe na programação do evento.
    const response = await atualizar({
      schedule: [{ ...itemCompleto, date: '2026-11-20' }],
    });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body)).toContain('schedule');
    expect(modeloEventos.documents[3]?.schedule).toBeUndefined();
  });

  it('responde 422 quando o endTime do item é anterior ao startTime', async () => {
    const response = await atualizar({
      schedule: [{ ...itemCompleto, endTime: '08:00' }],
    });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('endTime');
    expect(modeloEventos.documents[3]?.schedule).toBeUndefined();
  });

  it('responde 422 quando o item é pago e não informa o preço', async () => {
    const itemSemPreco = {
      date: itemCompleto.date,
      startTime: itemCompleto.startTime,
      endTime: itemCompleto.endTime,
      title: itemCompleto.title,
      description: itemCompleto.description,
      stage: itemCompleto.stage,
      relatedSpot: itemCompleto.relatedSpot,
      ticket: itemCompleto.ticket,
      ticketUrl: itemCompleto.ticketUrl,
    };

    const response = await atualizar({ schedule: [itemSemPreco] });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.details)).toContain('ticketPrice');
    expect(modeloEventos.documents[3]?.schedule).toBeUndefined();
  });

  it('limpa a programação quando o PUT manda lista vazia', async () => {
    const response = await atualizar({ schedule: [] });

    expect(response.status).toBe(200);
    expect(response.body.schedule).toHaveLength(0);
  });

  it('responde 422 quando o PUT muda o período e a programação salva fica fora', async () => {
    // A programação vale sobre o estado RESULTANTE: um PUT que só troca as
    // datas do evento não pode deixar item de programação fora do período.
    const primeira = await atualizar({
      schedule: [{ date: '2026-11-08', startTime: '09:00', title: 'Roda de samba' }],
    });
    expect(primeira.status).toBe(200);

    const response = await request(app)
      .put('/api/events/000000000000000000000004')
      .set('Authorization', 'Bearer token_admin')
      .send({ startDate: '2026-11-10', endDate: '2026-11-12' });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body)).toContain('schedule');
    // O período do evento não mudou.
    expect(modeloEventos.documents[3]?.startDate).toBe('2026-11-07');
  });

  it('aceita o PUT que muda o período mantendo a programação dentro', async () => {
    await atualizar({
      schedule: [{ date: '2026-11-08', startTime: '09:00', title: 'Roda de samba' }],
    });

    const response = await request(app)
      .put('/api/events/000000000000000000000004')
      .set('Authorization', 'Bearer token_admin')
      .send({ endDate: '2026-11-10' });

    expect(response.status).toBe(200);
    expect(modeloEventos.documents[3]?.endDate).toBe('2026-11-10');
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

describe('GET /api/events com parâmetro malformado', () => {
  it('parâmetro repetido (?category=festival&category=fair) → 400 em vez de filtrar menos', async () => {
    // Antes: o array descartava o filtro silenciosamente e devolvia MAIS
    // eventos do que o chamador pediu. Agora é um erro explícito.
    const response = await request(app).get('/api/events?category=festival&category=fair');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'category'");
  });

  it('categoria fora do enum → 400 (antes era lista vazia)', async () => {
    const response = await request(app).get('/api/events?category=FESTIVAL');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'category'");
  });

  it('active fora de true/false → 400', async () => {
    const response = await request(app).get('/api/events?active=1');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'active'");
  });

  it('includePast fora de true/false → 400', async () => {
    const response = await request(app).get('/api/events?includePast=1');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'includePast'");
  });

  it('city repetido → 400', async () => {
    const response = await request(app).get('/api/events?city=a&city=b');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'city'");
  });

  it('q repetido → 400', async () => {
    const response = await request(app).get('/api/events?q=a&q=b');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'q'");
  });
});
