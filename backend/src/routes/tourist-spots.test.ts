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

  it('filtra os pontos pela busca textual no nome (?q=)', async () => {
    const response = await request(app).get(`/api/tourist-spots?q=${encodeURIComponent('MIRANTE')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Mirante do Serra');
  });

  it('filtra os pontos pela busca textual na descrição (?q=)', async () => {
    const response = await request(app).get(`/api/tourist-spots?q=${encodeURIComponent('canindé')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Mirante do Serra');
  });

  it('devolve lista vazia quando a busca não casa nada (?q=)', async () => {
    const response = await request(app).get(`/api/tourist-spots?q=${encodeURIComponent('palavra-que-nao-existe')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect(response.body.items).toHaveLength(0);
  });

  it('não filtra quando a busca vem vazia (?q=)', async () => {
    const response = await request(app).get('/api/tourist-spots?q=');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items).toHaveLength(3);
  });

  it('o total da busca (?q=) reflete o resultado filtrado, não a coleção', async () => {
    // pageSize=1 limita a página, mas o total continua sendo 1: só um ponto
    // casa o termo, mesmo que a coleção tenha 3 documentos.
    const response = await request(app)
      .get(`/api/tourist-spots?q=${encodeURIComponent('retiro')}&page=1&pageSize=1`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].name).toBe('Cachoeira do Retiro');
  });

  it('não derruba a consulta quando a busca traz caractere especial (?q=)', async () => {
    // `cachoeira(` sem escape estouraria SyntaxError em new RegExp (→ 500);
    // a regex é escapada e o termo literal simplesmente não casa.
    const response = await request(app).get(`/api/tourist-spots?q=${encodeURIComponent('cachoeira(')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect(response.body.items).toHaveLength(0);
  });

  it('a busca textual convive com os demais filtros (?q= + city)', async () => {
    const response = await request(app)
      .get(`/api/tourist-spots?q=${encodeURIComponent('mirante')}&city=castelo-do-piaui`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Mirante do Serra');
  });

  it('responde 404 para id malformado', async () => {
    const response = await request(app).get('/api/tourist-spots/nao-e-um-object-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('id inválido');
  });

  it('redige os contatos do ponto turístico para o convidado (sem Authorization)', async () => {
    // Fixture extra (só neste teste): ponto com contato comercial e empresa
    // relacionada JÁ POPULADA — as demais provas rodam após o reset do
    // beforeEach, sem contar este documento.
    modeloPontos.documents.push({
      _id: '000000000000000000000004',
      name: 'Aquário Natural',
      slug: 'aquario-natural',
      description: 'Piscinas naturais com peixes coloridos',
      category: 'nature',
      address: 'Praia do Retiro, s/n',
      phone: '+5584991112222',
      whatsapp: '+5584991112222',
      website: 'https://aquario.example.com',
      instagram: '@aquarionatural',
      entryFee: 'paid',
      entryPrice: 'R$ 10,00',
      featured: true,
      active: true,
      relatedCompany: {
        _id: '000000000000000000000030',
        name: 'Parque Municipal',
        slug: 'parque-municipal',
        description: 'Empresa relacionada ao ponto turístico',
        category: 'entretenimento',
        phone: '+5584993334444',
        whatsapp: '+5584993334444',
        address: 'Av. Central, 500',
      },
    });

    const response = await request(app).get('/api/tourist-spots?category=nature&active=true');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    const ponto = response.body.items[0];
    expect(ponto.slug).toBe('aquario-natural');
    expect(ponto.phone).toBeNull();
    expect(ponto.whatsapp).toBeNull();
    // O endereço do atrativo é público (spec D14): preservado para o convidado.
    expect(ponto.address).toBe('Praia do Retiro, s/n');
    expect(ponto.entryPrice).toBe('R$ 10,00');
    expect(ponto.website).toBe('https://aquario.example.com');
    // A empresa aninhada NÃO pode burlar a redação com o contato comercial.
    expect(ponto.relatedCompany.phone).toBeNull();
    expect(ponto.relatedCompany.whatsapp).toBeNull();
    expect(ponto.relatedCompany.address).toBeNull();
    expect(ponto.relatedCompany.name).toBe('Parque Municipal');
  });

  it('mantém o ponto turístico completo para sessão autenticada', async () => {
    modeloPontos.documents.push({
      _id: '000000000000000000000004',
      name: 'Aquário Natural',
      slug: 'aquario-natural',
      description: 'Piscinas naturais com peixes coloridos',
      category: 'nature',
      address: 'Praia do Retiro, s/n',
      phone: '+5584991112222',
      whatsapp: '+5584991112222',
      active: true,
    });

    const response = await request(app)
      .get('/api/tourist-spots?category=nature&active=true')
      .set('Authorization', 'Bearer token_comum');

    expect(response.status).toBe(200);
    const ponto = response.body.items[0];
    expect(ponto.slug).toBe('aquario-natural');
    expect(ponto.phone).toBe('+5584991112222');
    expect(ponto.whatsapp).toBe('+5584991112222');
    expect(ponto.address).toBe('Praia do Retiro, s/n');
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

  it('responde 422 quando o PUT deixa a entrada paga sem preço', async () => {
    // Doc anterior tem entryFee 'free' e o payload só troca para 'paid':
    // a invariante deve ser reforçada sobre o estado resultante.
    const response = await request(app)
      .put('/api/tourist-spots/000000000000000000000001')
      .set('Authorization', 'Bearer token_admin')
      .send({ entryFee: 'paid' });

    expect(response.status).toBe(422);
    expect(modeloPontos.documents[0]?.entryFee).toBe('free');
  });

  it('mantém a entrada paga com preço já salvo quando o PUT não manda entryFee', async () => {
    // Doc 2 já tem entryFee 'paid' + entryPrice salvos: um PUT que só troca o
    // nome não pode ser barrado pela invariante.
    const response = await request(app)
      .put('/api/tourist-spots/000000000000000000000002')
      .set('Authorization', 'Bearer token_admin')
      .send({ name: 'Cachoeira do Retiro Atualizada' });

    expect(response.status).toBe(200);
    expect(modeloPontos.documents[1]?.name).toBe('Cachoeira do Retiro Atualizada');
    expect(modeloPontos.documents[1]?.entryPrice).toBe('R$ 10,00');
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

describe('GET /api/tourist-spots com parâmetro malformado', () => {
  it('parâmetro repetido (?category=nature&category=museum) → 400 em vez de filtrar menos', async () => {
    const response = await request(app).get('/api/tourist-spots?category=nature&category=museum');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'category'");
  });

  it('categoria fora do enum → 400 (antes era lista vazia)', async () => {
    const response = await request(app).get('/api/tourist-spots?category=NATURE');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'category'");
  });

  it('active fora de true/false → 400', async () => {
    const response = await request(app).get('/api/tourist-spots?active=1');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'active'");
  });

  it('city repetido → 400', async () => {
    const response = await request(app).get('/api/tourist-spots?city=a&city=b');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'city'");
  });

  it('q repetido → 400', async () => {
    const response = await request(app).get('/api/tourist-spots?q=a&q=b');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'q'");
  });
});
