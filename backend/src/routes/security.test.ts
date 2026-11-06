import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AutonomousProfessionalModel } from '../models/autonomous-professional.model.js';
import { BannerModel } from '../models/banner.model.js';
import { CategoryModel } from '../models/category.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { JobModel } from '../models/job.model.js';
import { NoticeModel } from '../models/notice.model.js';
import { PublicUtilityModel } from '../models/public-utility.model.js';
import { PushTokenModel } from '../models/push-token.model.js';
import { TourEventModel } from '../models/event.model.js';
import { TouristSpotModel } from '../models/tourist-spot.model.js';
import { UserModel } from '../models/user.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

/**
 * Suíte de regressão de segurança: varre TODOS os endpoints com filtro e
 * prova que nenhuma entrada maliciosa vira operador de query, derruba a API
 * (500) ou vaza contato para convidado.
 *
 * Sem sessão em todo o arquivo: quem chama é um CONVIDADO — exatamente o
 * papel mais frágil. As asserções de contato fazem varredura de sentinela
 * (valores que só existem no banco), então um vazamento em QUALQUER campo
 * falha o teste, não importa em que shape a API devolva o dado.
 */

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

/** Modelos em memória: nenhum Mongo nos testes de rota. */

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

vi.mock('../models/banner.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { BannerModel: criarModeloEmMemoria() };
});

vi.mock('../models/coupon.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CouponModel: criarModeloEmMemoria() };
});

vi.mock('../models/job.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { JobModel: criarModeloEmMemoria() };
});

vi.mock('../models/notice.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { NoticeModel: criarModeloEmMemoria() };
});

vi.mock('../models/public-utility.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { PublicUtilityModel: criarModeloEmMemoria() };
});

vi.mock('../models/tourist-spot.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { TouristSpotModel: criarModeloEmMemoria() };
});

vi.mock('../models/event.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { TourEventModel: criarModeloEmMemoria() };
});

vi.mock('../models/autonomous-professional.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { AutonomousProfessionalModel: criarModeloEmMemoria() };
});

vi.mock('../models/push-token.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { PushTokenModel: criarModeloEmMemoria() };
});

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloCategorias = CategoryModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloBanners = BannerModel as unknown as MemoryModel;
const modeloCupons = CouponModel as unknown as MemoryModel;
const modeloVagas = JobModel as unknown as MemoryModel;
const modeloAvisos = NoticeModel as unknown as MemoryModel;
const modeloServicos = PublicUtilityModel as unknown as MemoryModel;
const modeloPontos = TouristSpotModel as unknown as MemoryModel;
const modeloEventos = TourEventModel as unknown as MemoryModel;
const modeloAutonomos = AutonomousProfessionalModel as unknown as MemoryModel;
const modeloTokens = PushTokenModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

// ---------------------------------------------------------------------------
// Dados: uma coleção por endpoint, com DUPLICIDADE onde existe filtro — sem
// dois registros distintos, "sem filtro" e "com filtro" seriam indistinguíveis
// e o teste não provaria nada.
// ---------------------------------------------------------------------------

const ID_CATEGORIA_1 = '000000000000000000000101';
const ID_CATEGORIA_2 = '000000000000000000000102';
const ID_CIDADE = '000000000000000000000301';
const ID_EMPRESA_1 = '000000000000000000000201';
const ID_EMPRESA_2 = '000000000000000000000202';
const AVISO_ATIVO_ID = '000000000000000000000061';
const AVISO_RASCUNHO_ID = '000000000000000000000062';

/** Contatos de sentinela: se aparecerem em qualquer resposta de convidado, é vazamento. */
const SENTINELAS: string[] = [
  '(86) 3232-1001',
  '(86) 99999-1001',
  'Rua Sentinela 1',
  '(86) 3232-2001',
  '(86) 3232-2002',
  '(86) 3232-3001',
  '(86) 3232-3002',
  '(86) 3232-4001',
  '(86) 3232-4002',
  'SENTINELA-CUPOM',
];

const categoriasFake: MemoryDocument[] = [
  { _id: ID_CATEGORIA_1, slug: 'restaurante', name: 'Restaurantes' },
  { _id: ID_CATEGORIA_2, slug: 'servicos', name: 'Serviços' },
];

const cidadesFake: MemoryDocument[] = [
  { _id: ID_CIDADE, name: 'Castelo do Piauí', slug: 'castelo-do-piaui', state: 'PI' },
];

const empresasFake: MemoryDocument[] = [
  {
    _id: ID_EMPRESA_1,
    slug: 'pizzaria-lumiere',
    name: 'Pizzaria Lumière',
    description: 'Pizzas artesanais',
    category: ID_CATEGORIA_1,
    city: ID_CIDADE,
    address: 'Rua Sentinela 1',
    phone: '(86) 3232-1001',
    whatsapp: '(86) 99999-1001',
    isFeatured: true,
    ownerClerkId: 'user_comum',
  },
  {
    _id: ID_EMPRESA_2,
    slug: 'oficina-rocha',
    name: 'Oficina Rocha',
    description: 'Mecânica em geral',
    category: ID_CATEGORIA_2,
    city: ID_CIDADE,
    address: 'Rua Comum 2',
    phone: '(86) 3232-1002',
    whatsapp: '(86) 99999-1002',
    isFeatured: false,
  },
];

const pontosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000401',
    slug: 'mirante-do-serra',
    name: 'Mirante do Serra',
    description: 'Trilha com vista do vale',
    category: 'park',
    city: ID_CIDADE,
    phone: '(86) 3232-2001',
    whatsapp: '(86) 99999-2001',
    active: true,
    order: 1,
  },
  {
    _id: '000000000000000000000402',
    slug: 'igreja-matriz',
    name: 'Igreja Matriz',
    description: 'Construção do século XIX',
    category: 'church',
    phone: '(86) 3232-2002',
    whatsapp: '(86) 99999-2002',
    active: false,
    order: 2,
  },
];

const eventosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000501',
    name: 'Festival do Queijo',
    description: 'Feira gastronômica local',
    location: 'Praça central',
    category: 'festival',
    city: ID_CIDADE,
    phone: '(86) 3232-3001',
    whatsapp: '(86) 99999-3001',
    active: true,
    startDate: '2099-01-10',
    endDate: '2099-01-12',
  },
  {
    _id: '000000000000000000000502',
    name: 'Show de Abertura',
    description: 'Show em palco montado',
    location: 'Ginásio',
    category: 'show',
    phone: '(86) 3232-3002',
    whatsapp: '(86) 99999-3002',
    active: false,
    startDate: '2099-02-10',
    endDate: '2099-02-12',
  },
];

const servicosFake: MemoryDocument[] = [
  { _id: '000000000000000000000601', name: 'Polícia Militar', category: 'emergency', phone: '190', order: 1, active: true },
  { _id: '000000000000000000000602', name: 'Polícia Civil', category: 'civil', phone: '197', order: 2, active: true },
  { _id: '000000000000000000000603', name: 'Hospital Municipal', category: 'health', phone: '192', order: 3, active: false },
];

const avisosFake: MemoryDocument[] = [
  {
    _id: AVISO_ATIVO_ID,
    title: 'Feira seria adiada',
    body: 'A feira foi adiada para o próximo sábado.',
    active: true,
  },
  {
    _id: AVISO_RASCUNHO_ID,
    title: 'Rascunho interno',
    body: 'Aviso ainda não publicado.',
    active: false,
  },
];

const cuponsFake: MemoryDocument[] = [
  { _id: '000000000000000000000701', title: 'Combo familiar', code: 'SENTINELA-CUPOM-10', company: ID_EMPRESA_1 },
  { _id: '000000000000000000000702', title: 'Troca de óleo', code: 'SENTINELA-CUPOM-20', company: ID_EMPRESA_2 },
];

const bannersFake: MemoryDocument[] = [
  { _id: '000000000000000000000801', title: 'Banner 1', order: 1 },
  { _id: '000000000000000000000802', title: 'Banner 2', order: 2 },
];

const vagasFake: MemoryDocument[] = [
  { _id: '000000000000000000000901', title: 'Vaga de garçom', company: ID_EMPRESA_1 },
  { _id: '000000000000000000000902', title: 'Vaga de mecânico', company: ID_EMPRESA_2 },
];

const autonomosFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000a01',
    slug: 'pedreiro-joao',
    name: 'Pedreiro João',
    specialty: 'construção civil',
    phone: '(86) 3232-4001',
    whatsapp: '(86) 99999-4001',
  },
  {
    _id: '000000000000000000000a02',
    slug: 'eletricista-maria',
    name: 'Eletricista Maria',
    specialty: 'elétrica',
    phone: '(86) 3232-4002',
    whatsapp: '(86) 99999-4002',
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
  fetchFake.mockReset();
  reposicionar(modeloCategorias, categoriasFake);
  reposicionar(modeloCidades, cidadesFake);
  reposicionar(modeloEmpresas, empresasFake);
  reposicionar(modeloBanners, bannersFake);
  reposicionar(modeloCupons, cuponsFake);
  reposicionar(modeloVagas, vagasFake);
  reposicionar(modeloAvisos, avisosFake);
  reposicionar(modeloServicos, servicosFake);
  reposicionar(modeloPontos, pontosFake);
  reposicionar(modeloEventos, eventosFake);
  reposicionar(modeloAutonomos, autonomosFake);
  reposicionar(modeloTokens, []);
  reposicionar(modeloUsuarios, usuariosFake);
});

function reposicionar(modelo: MemoryModel, sementes: MemoryDocument[]): void {
  modelo.documents.length = 0;
  modelo.documents.push(...sementes.map((documento) => ({ ...documento })));
}

/** Convidado nunca pode ver sentinela nenhuma em NENHUM campo da resposta. */
function verificarSemVazamento(resposta: { body: unknown }): void {
  const corpo = JSON.stringify(resposta.body);
  for (const sentinela of SENTINELAS) {
    expect(corpo).not.toContain(sentinela);
  }
}

// ---------------------------------------------------------------------------
// 1. Varredura de parâmetros maliciosos: todos os endpoints com filtro
// ---------------------------------------------------------------------------

interface Caso {
  /** Query completa: usado como nome do teste e como rota efetiva. */
  rota: string;
  /** Status OBRIGATÓRIO da resposta (rede de segurança já em vigor). */
  status: number;
  /** Quando a resposta é paginada: total esperado. */
  total?: number;
  /** Quando a resposta é paginada: page efetivo esperado. */
  page?: number;
  /** Quando a resposta é paginada: pageSize efetivo esperado. */
  pageSize?: number;
}

/** Construtor de caso: mantém a tabela declarativa e o teste descritivo. */
function caso(rota: string, status: number, extras: Omit<Caso, 'rota' | 'status'> = {}): Caso {
  return { rota, status, ...extras };
}

/** Endpoints de listagem com filtro — cada caso recebe o parâmetro malicioso. */
const CASOS_VARREDURA: Caso[] = [
  // GET /api/companies (category, q, featured, owner, city, page, pageSize)
  caso('/api/companies?category[$ne]=x', 200, { total: 2 }),
  caso('/api/companies?category[a]=1', 200, { total: 2 }),
  caso('/api/companies?q[$gt]=', 200, { total: 2 }),
  caso('/api/companies?city[$in][]=x', 200, { total: 2 }),
  caso('/api/companies?category=a&category=b', 400),
  caso('/api/companies?q=a&q=b', 400),
  caso('/api/companies?city=x&city=y', 400),
  caso('/api/companies?featured=1', 400),
  caso(`/api/companies?owner=usuario_alheio`, 403),
  caso(`/api/companies?owner=`, 200, { total: 2 }),
  caso('/api/companies?page=1e15', 200, { total: 2, page: 1 }),
  caso('/api/companies?page=abc', 200, { total: 2, page: 1 }),
  caso('/api/companies?pageSize=1e9', 200, { total: 2, pageSize: 20 }),
  caso(`/api/companies?q=${'a'.repeat(1000)}`, 400),
  caso('/api/companies?pageSize=1000', 200, { total: 2, pageSize: 100 }),

  // GET /api/coupons (company, page, pageSize)
  caso('/api/coupons?company[$ne]=x', 200, { total: 2 }),
  caso('/api/coupons?company[a]=1', 200, { total: 2 }),
  caso('/api/coupons?company=a&company=b', 400),
  caso('/api/coupons?page=abc', 200, { total: 2 }),

  // GET /api/notices (active: true/false/all, page, pageSize) — o default é
  // fail-closed (ativos e vigentes); false/all são consultas administrativas.
  caso('/api/notices?active=xyz', 400),
  caso('/api/notices?active=true&active=false', 400),
  caso('/api/notices?active=all', 401),
  caso('/api/notices?page=abc', 200, { total: 1 }),

  // GET /api/public-utilities (category enum, active, city)
  caso('/api/public-utilities?category[$ne]=x', 200, { total: 3 }),
  caso('/api/public-utilities?category[a]=1', 200, { total: 3 }),
  caso('/api/public-utilities?city[$in][]=x', 200, { total: 3 }),
  caso('/api/public-utilities?category=emergency&category=civil', 400),
  caso('/api/public-utilities?active=xyz', 400),
  // `active[a]=1` vira uma CHAVE literal com o parser simple do Express 5:
  // para o controller `active` está ausente (200 tocado por nada). Com parser
  // extended (se um dia voltar) seria 400 — o guard de tipo já está lá.
  caso('/api/public-utilities?active[a]=1', 200, { total: 3 }),
  caso('/api/public-utilities?city=a&city=b', 400),
  caso('/api/public-utilities?page=abc', 200, { total: 3 }),

  // GET /api/tourist-spots (category enum, q, active, city)
  caso('/api/tourist-spots?category[$ne]=x', 200, { total: 2 }),
  caso('/api/tourist-spots?category[a]=1', 200, { total: 2 }),
  caso('/api/tourist-spots?category=park&category=church', 400),
  caso('/api/tourist-spots?active=xyz', 400),
  caso('/api/tourist-spots?q=a&q=b', 400),
  caso('/api/tourist-spots?city[$in][]=x', 200, { total: 2 }),
  caso(`/api/tourist-spots?q=${'a'.repeat(1000)}`, 400),

  // GET /api/events (category enum, q, active, includePast, city)
  caso('/api/events?category[$ne]=x', 200, { total: 2 }),
  caso('/api/events?category=festival&category=show', 400),
  caso('/api/events?active=xyz', 400),
  caso('/api/events?includePast=maybe', 400),
  caso('/api/events?q[$gt]=', 200, { total: 2 }),
  caso('/api/events?city[$in][]=x', 200, { total: 2 }),
  caso(`/api/events?q=${'a'.repeat(1000)}`, 400),

  // Endpoints sem filtro dedicado: payload malicioso não pode derrubar nem
  // vazar — parâmetro desconhecido é ignorado (nunca interpretado como filtro).
  caso('/api/categories?category[$ne]=x', 200, { total: 2 }),
  caso('/api/categories?q[$gt]=', 200, { total: 2 }),
  caso('/api/categories?page=abc', 200, { total: 2 }),

  caso('/api/banners?category[$ne]=x', 200, { total: 2 }),
  caso('/api/banners?active=xyz', 200, { total: 2 }),
  caso('/api/banners?page=abc', 200, { total: 2 }),

  caso('/api/jobs?category[$ne]=x', 200, { total: 2 }),
  caso('/api/jobs?q=a&q=b', 200, { total: 2 }),
  caso('/api/jobs?page=abc', 200, { total: 2 }),

  caso('/api/autonomous-professionals?category[$ne]=x', 200, { total: 2 }),
  caso('/api/autonomous-professionals?active=xyz', 200, { total: 2 }),
  caso('/api/autonomous-professionals?page=abc', 200, { total: 2 }),

  // Painel de usuários: tudo exige sessão de admin; convidado morre em 401.
  caso('/api/users?category[$ne]=x', 401),
  caso('/api/users?page=abc', 401),

  // Cidades devolve array cru (sem paginação): segue sem 500 e sem filtro.
  caso('/api/cities?category[$ne]=x', 200),
  caso(`/api/cities?q=${'a'.repeat(1000)}`, 200),
];

async function varrerCaso(alvo: Caso): Promise<void> {
  const resposta = await request(app).get(alvo.rota);

  // Nunca 500 (nem 502/503): o status esperado é específico (400/401/403/200),
  // não um range — um 500 nunca coincide com a expectativa e o teste falha.
  expect(resposta.status).toBe(alvo.status);
  verificarSemVazamento(resposta);

  if (alvo.status !== 200) return;
  if (Array.isArray(resposta.body)) return; // /cities: array cru

  const corpo = resposta.body as Record<string, unknown>;
  expect(Array.isArray(corpo.items)).toBe(true);
  if (alvo.total !== undefined) {
    expect(corpo.total).toBe(alvo.total);
  }
  if (alvo.page !== undefined) {
    expect(corpo.page).toBe(alvo.page);
  }
  if (alvo.pageSize !== undefined) {
    expect(corpo.pageSize).toBe(alvo.pageSize);
  }
  const limiteEfetivo = typeof corpo.pageSize === 'number' ? corpo.pageSize : 20;
  expect((corpo.items as unknown[]).length).toBeLessThanOrEqual(limiteEfetivo);
}

describe('1.1 Varredura de parâmetros maliciosos (todos os endpoints, convidado)', () => {
  for (const alvo of CASOS_VARREDURA) {
    it(`${alvo.rota} → ${alvo.status} (nunca 500, sem vazamento de sentinela)`, () => varrerCaso(alvo));
  }
});

// ---------------------------------------------------------------------------
// Sanidade: filtrar e NÃO filtrar têm que diferir — sem isso nada é provado.
// ---------------------------------------------------------------------------

describe('Sanidade: filtro válido reduz a lista (dados semeiam a diferença)', () => {
  interface Expectativa {
    rota: string;
    total: number;
    /** Campo do título em cada recurso (name na maioria; title em cupom/aviso). */
    campoTitulo?: 'name' | 'title';
    primeiroTitulo?: string;
  }

  const expectativas: Expectativa[] = [
    { rota: '/api/companies', total: 2 },
    { rota: '/api/companies?category=restaurante', total: 1, campoTitulo: 'name', primeiroTitulo: 'Pizzaria Lumière' },
    { rota: '/api/companies?featured=false', total: 1, campoTitulo: 'name', primeiroTitulo: 'Oficina Rocha' },
    { rota: '/api/events', total: 2 },
    { rota: '/api/events?category=festival', total: 1, campoTitulo: 'name', primeiroTitulo: 'Festival do Queijo' },
    { rota: '/api/tourist-spots', total: 2 },
    { rota: '/api/tourist-spots?category=park', total: 1, campoTitulo: 'name', primeiroTitulo: 'Mirante do Serra' },
    { rota: '/api/tourist-spots?active=false', total: 1, campoTitulo: 'name', primeiroTitulo: 'Igreja Matriz' },
    { rota: '/api/public-utilities', total: 3 },
    { rota: '/api/public-utilities?active=false', total: 1, campoTitulo: 'name', primeiroTitulo: 'Hospital Municipal' },
    { rota: '/api/categories', total: 2 },
    { rota: '/api/banners', total: 2 },
    { rota: '/api/jobs', total: 2 },
    { rota: '/api/autonomous-professionals', total: 2 },
    { rota: `/api/coupons?company=${ID_EMPRESA_1}`, total: 1, campoTitulo: 'title', primeiroTitulo: 'Combo familiar' },
    { rota: '/api/notices?active=true', total: 1, campoTitulo: 'title', primeiroTitulo: 'Feira seria adiada' },
  ];

  for (const expectativa of expectativas) {
    it(`${expectativa.rota} → total ${expectativa.total}`, async () => {
      const resposta = await request(app).get(expectativa.rota);
      expect(resposta.status).toBe(200);
      expect(resposta.body.total).toBe(expectativa.total);
      if (expectativa.primeiroTitulo) {
        const campo = expectativa.campoTitulo ?? 'name';
        expect(resposta.body.items[0][campo]).toBe(expectativa.primeiroTitulo);
      }
      verificarSemVazamento(resposta);
    });
  }

  it('cupons sem filtro trazem os dois; com filtro trazem só o da empresa', async () => {
    const semFiltro = await request(app).get('/api/coupons');
    expect(semFiltro.body.total).toBe(2);

    const comFiltro = await request(app).get(`/api/coupons?company=${ID_EMPRESA_2}`);
    expect(comFiltro.body.total).toBe(1);
    expect(comFiltro.body.items[0].title).toBe('Troca de óleo');
  });

  it('cidades devolve array com a cidade semeada', async () => {
    const resposta = await request(app).get('/api/cities');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].slug).toBe('castelo-do-piaui');
  });

  it('convidado recebe phone/whatsapp/address/code null nas listagens', async () => {
    const empresas = await request(app).get('/api/companies?category=restaurante');
    expect(empresas.body.items[0].phone).toBeNull();
    expect(empresas.body.items[0].whatsapp).toBeNull();
    expect(empresas.body.items[0].address).toBeNull();

    const cupons = await request(app).get('/api/coupons');
    expect(cupons.body.items[0].code).toBeNull();

    const eventos = await request(app).get('/api/events?category=festival');
    expect(eventos.body.items[0].phone).toBeNull();

    const autonomos = await request(app).get('/api/autonomous-professionals');
    expect(autonomos.body.items[0].phone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 1.2 Bypass de filtro (o bug original): parâmetro repetido nunca devolve lista
// ---------------------------------------------------------------------------

describe('1.2 Parâmetro repetido → 400 fail-closed (nunca lista sem filtro)', () => {
  const rotas = [
    '/api/companies?category=a&category=b',
    '/api/events?category=festival&category=show',
    '/api/companies?q=a&q=b',
    '/api/companies?city=x&city=y',
  ];

  for (const rota of rotas) {
    it(`GET ${rota} → 400 e corpo de erro nomeando o parâmetro`, async () => {
      const resposta = await request(app).get(rota);
      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toContain('Parâmetro inválido');
      verificarSemVazamento(resposta);
    });
  }
});

// ---------------------------------------------------------------------------
// 1.3 Limites: q ≤ 120, page ≤ 10 000 (clamp), pageSize ≤ 100 (clamp)
// ---------------------------------------------------------------------------

describe('1.3 Limites de paginação e busca', () => {
  it('q com 121 caracteres → 400 (limite é 120)', async () => {
    const resposta = await request(app).get(`/api/companies?q=${'a'.repeat(121)}`);
    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toContain("'q'");
  });

  it('q com exatamente 120 caracteres → 200 (no teto)', async () => {
    const resposta = await request(app).get(`/api/companies?q=${'z'.repeat(120)}`);
    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(0);
  });

  it('page=999999999 → clampada no teto 10 000 (skip limitado, resposta saudável)', async () => {
    const resposta = await request(app).get('/api/companies?page=999999999');
    expect(resposta.status).toBe(200);
    expect(resposta.body.page).toBe(10000);
    expect(resposta.body.pageSize).toBe(20);
    expect(resposta.body.total).toBe(2);
  });

  it('pageSize=1000 → clamped no teto 100', async () => {
    const resposta = await request(app).get('/api/companies?pageSize=1000');
    expect(resposta.status).toBe(200);
    expect(resposta.body.pageSize).toBe(100);
  });

  it('page=1e15 (notação científica) → default seguro, nunca skip gigante', async () => {
    const resposta = await request(app).get('/api/companies?page=1e15');
    expect(resposta.status).toBe(200);
    expect(resposta.body.page).toBe(1);
  });

  it('q com 1000 caracteres → 400 (antes de qualquer regex)', async () => {
    const resposta = await request(app).get(`/api/tourist-spots?q=${'x'.repeat(1000)}`);
    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toContain("'q'");
  });
});

// ---------------------------------------------------------------------------
// 1.4 Bodies: regressão da Task 3 (zod na borda, nada vira operador de query)
// ---------------------------------------------------------------------------

describe('1.4 Bodies maliciosos (regressão da Task 3)', () => {
  it('POST /api/push-tokens com {"token":{"$ne":null}} → 422 e nenhum documento', async () => {
    const resposta = await request(app).post('/api/push-tokens').send({
      token: { $ne: null },
    });

    expect(resposta.status).toBe(422);
    expect(modeloTokens.documents).toHaveLength(0);
  });

  it('POST /api/notifications/broadcast com title gigante → 422 e fetch nunca sai', async () => {
    const resposta = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', 'Bearer token_admin')
      .send({ title: 't'.repeat(5000), body: 'Texto' });

    expect(resposta.status).toBe(422);
    expect(fetchFake).not.toHaveBeenCalled();
  });

  it('POST /api/notifications/broadcast com body gigante → 422', async () => {
    const resposta = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', 'Bearer token_admin')
      .send({ title: 'Título', body: 'b'.repeat(5000) });

    expect(resposta.status).toBe(422);
    expect(fetchFake).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 1.5 Autorização (regressão): sessões e o filtro "minhas empresas"
// ---------------------------------------------------------------------------

describe('1.5 Autorização', () => {
  it('GET /api/users sem sessão → 401', async () => {
    const resposta = await request(app).get('/api/users');
    expect(resposta.status).toBe(401);
  });

  it('GET /api/users com usuário comum → 403', async () => {
    const resposta = await request(app).get('/api/users').set('Authorization', 'Bearer token_comum');
    expect(resposta.status).toBe(403);
  });

  it('GET /api/users com admin → 200', async () => {
    const resposta = await request(app).get('/api/users').set('Authorization', 'Bearer token_admin');
    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(2);
  });

  it('GET /api/companies?owner=outro-clerkId (convidado) → 403', async () => {
    const resposta = await request(app).get('/api/companies?owner=user_admin');
    expect(resposta.status).toBe(403);
  });

  it('GET /api/companies?owner=outro-clerkId (usuário comum) → 403', async () => {
    const resposta = await request(app)
      .get('/api/companies?owner=user_admin')
      .set('Authorization', 'Bearer token_comum');
    expect(resposta.status).toBe(403);
  });

  it('GET /api/companies?owner=próprio-clerkId (usuário comum) → 200 (só as dele)', async () => {
    const resposta = await request(app)
      .get('/api/companies?owner=user_comum')
      .set('Authorization', 'Bearer token_comum');
    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(1);
    expect(resposta.body.items[0].name).toBe('Pizzaria Lumière');
  });

  it('POST /api/tourist-spots sem sessão → 401', async () => {
    const resposta = await request(app).post('/api/tourist-spots').send({
      name: 'Gruta da Cruz',
      slug: 'gruta-da-cruz',
      description: 'Formação rochosa com mirante',
      category: 'nature',
      city: 'castelo-do-piaui',
      active: true,
      entryFee: 'free',
    });
    expect(resposta.status).toBe(401);
    expect(modeloPontos.documents).toHaveLength(2);
  });

  it('POST /api/tourist-spots com usuário comum → 403 e nada gravado', async () => {
    const resposta = await request(app)
      .post('/api/tourist-spots')
      .set('Authorization', 'Bearer token_comum')
      .send({
        name: 'Gruta da Cruz',
        slug: 'gruta-da-cruz',
        description: 'Formação rochosa com mirante',
        category: 'nature',
        city: 'castelo-do-piaui',
        active: true,
        entryFee: 'free',
      });
    expect(resposta.status).toBe(403);
    expect(modeloPontos.documents).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Rascunhos de aviso: ?active=false é consulta administrativa
// ---------------------------------------------------------------------------

describe('2. GET /api/notices?active=false exige admin (rascunhos não são públicos)', () => {
  it('convidado com ?active=all fica sem acesso (nunca recebe lista completa)', async () => {
    const resposta = await request(app).get('/api/notices?active=all');
    expect(resposta.status).toBe(401);

    const textoResposta = JSON.stringify(resposta.body);
    expect(textoResposta).not.toContain('Rascunho interno');
  });

  it('convidado com ?active=false fica sem acesso (nunca recebe rascunho)', async () => {
    const resposta = await request(app).get('/api/notices?active=false');
    expect(resposta.status).toBe(401);

    const textoResposta = JSON.stringify(resposta.body);
    expect(textoResposta).not.toContain('Rascunho interno');
  });

  it('usuário comum com ?active=false → 403 (sem a role admin)', async () => {
    const resposta = await request(app)
      .get('/api/notices?active=false')
      .set('Authorization', 'Bearer token_comum');
    expect(resposta.status).toBe(403);
  });

  it('admin com ?active=false lista só os rascunhos (ativos ficam de fora)', async () => {
    const resposta = await request(app)
      .get('/api/notices?active=false')
      .set('Authorization', 'Bearer token_admin');
    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(1);
    expect(resposta.body.items[0].title).toBe('Rascunho interno');
  });

  it('admin com ?active=all lista todos (ativo + rascunho)', async () => {
    const resposta = await request(app)
      .get('/api/notices?active=all')
      .set('Authorization', 'Bearer token_admin');
    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(2);
  });

  it('?active=true continua público e traz só o publicado', async () => {
    const resposta = await request(app).get('/api/notices?active=true');
    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(1);
    expect(resposta.body.items[0].title).toBe('Feira seria adiada');
  });
});
