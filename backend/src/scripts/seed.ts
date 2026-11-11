/**
 * Seed de desenvolvimento: popula o banco com dados de exemplo para o app,
 * o painel e os testes manuais funcionarem de primeira.
 *
 * Uso: npx tsx src/scripts/seed.ts [--reset]
 *   --reset  apaga as coleções antes de inserir (idempotência opcional)
 *
 * O script é seguro de rodar mais de uma vez: sem --reset, ele ignora
 * documentos cujo slug/title já exista.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/db.js';
import { BannerModel } from '../models/banner.model.js';
import { CategoryModel } from '../models/category.model.js';
import { CompanyModel } from '../models/company.model.js';
import { CityModel } from '../models/city.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { JobModel } from '../models/job.model.js';
import { AutonomousProfessionalModel } from '../models/autonomous-professional.model.js';
import { NoticeModel } from '../models/notice.model.js';
import { PublicUtilityModel } from '../models/public-utility.model.js';
import { TouristSpotModel } from '../models/tourist-spot.model.js';
import { TourEventModel } from '../models/event.model.js';
import { montarEventosTuristicos, montarEventosTuristicosTeresina } from './seed-turismo.js';

const shouldReset = process.argv.includes('--reset');

/** Insere apenas os documentos cuja chave natural ainda não existe no banco.
 *
 * Usa upsert atomico por documento (updateOne com upsert) em vez de
 * find + insert, evitando corrida entre verificacao e insercao. */
async function insertIfMissing<T>(
  model: mongoose.Model<T>,
  documents: Record<string, unknown>[],
  uniqueField: string,
): Promise<number> {
  let inserted = 0;
  for (const doc of documents) {
    const result = await model.updateOne(
      { [uniqueField]: doc[uniqueField] },
      { $setOnInsert: doc },
      { upsert: true },
    );
    if (result.upsertedCount && result.upsertedCount > 0) {
      inserted += 1;
    }
  }
  return inserted;
}

/** Formata uma Date local como `YYYY-MM-DD` (data pura, sem hora e sem fuso).
 * O módulo de turismo compara datas como string, então o formato é obrigatório. */
function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Soma dias a uma Date mantendo o horário local (para datas puras). */
function somarDias(data: Date, dias: number): Date {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/**
 * Ids das atrações por slug.
 *
 * A programação do evento referencia a atração pelo id (o schema do item
 * guarda ObjectId, não slug): o seed resolve o slug depois de inserir as
 * atrações.
 */
async function idsAtracoesPorSlug(slugs: string[]): Promise<Map<string, string>> {
  const encontradas = await TouristSpotModel.find({ slug: { $in: slugs } })
    .select({ _id: 1, slug: 1 })
    .lean();
  return new Map(encontradas.map((atracao) => [atracao.slug, String(atracao._id)]));
}

async function seed(): Promise<void> {
  if (shouldReset) {
    await Promise.all([
      CategoryModel.deleteMany({}),
      CityModel.deleteMany({}),
      CompanyModel.deleteMany({}),
      BannerModel.deleteMany({}),
      CouponModel.deleteMany({}),
      JobModel.deleteMany({}),
      AutonomousProfessionalModel.deleteMany({}),
      NoticeModel.deleteMany({}),
      PublicUtilityModel.deleteMany({}),
      TouristSpotModel.deleteMany({}),
      TourEventModel.deleteMany({}),
    ]);
    console.log('Coleções limpas (--reset)');
  }

  const categorias = [
    { name: 'Construção', slug: 'construcao', icon: 'hammer-wrench', order: 1 },
    { name: 'Alimentação', slug: 'alimentacao', icon: 'silverware-fork-knife', order: 2 },
    { name: 'Oficina', slug: 'oficina', icon: 'car-wrench', order: 3 },
    { name: 'Farmácia', slug: 'farmacia', icon: 'medical-bag', order: 4 },
    { name: 'Beleza', slug: 'beleza', icon: 'content-cut', order: 5 },
    { name: 'Serviços', slug: 'servicos', icon: 'tools', order: 6 },
    { name: 'Saúde', slug: 'saude', icon: 'hospital-building', order: 7 },
  ];

  const inseridas = await insertIfMissing(CategoryModel, categorias, 'slug');
  console.log(`Categorias inseridas: ${inseridas}`);

  const cidades = [
    { name: 'Castelo do Piauí', slug: 'castelo-do-piaui', state: 'PI' },
    { name: 'Teresina', slug: 'teresina', state: 'PI' },
  ];
  const inseridasCidades = await insertIfMissing(CityModel, cidades, 'slug');
  console.log(`Cidades inseridas: ${inseridasCidades}`);

  const cidadePorSlug = new Map(
    (await CityModel.find().lean()).map((cidade) => [cidade.slug, cidade._id]),
  );
  const casteloId = cidadePorSlug.get('castelo-do-piaui');

  const categoriaPorSlug = new Map(
    (await CategoryModel.find().lean()).map((categoria) => [categoria.slug, categoria._id]),
  );

  const empresas = [
    {
      name: 'Construtora Alicerce',
      slug: 'construtora-alicerce',
      description:
        'Fundada em 2008, a Construtora Alicerce nasceu com o propósito de transformar a forma de construir em Castelo do Piauí. Ao longo de mais de uma década, ajudamos famílias e empresas a tirar projetos do papel, unindo planejamento, qualidade e respeito aos prazos. Nossa missão é construir espaços seguros, funcionais e duradouros, sempre com transparência e atenção às pessoas.',
      category: categoriaPorSlug.get('construcao'),
      phone: '+55 85 99999-0001',
      whatsapp: '+55 85 99999-0001',
      address: 'Av. Brasil, 1520 — Centro',
      city: casteloId,
      latitude: -3.7319,
      longitude: -38.5267,
      registry: 'CREA-CE 12345',
      isFeatured: true,
      rating: 4.7,
      ratingCount: 128,
      isVerified: true,
      website: 'https://construtoraalicerce.com.br',
      instagram: '@construtoraalicerce',
      facebook: 'https://facebook.com/construtoraalicerce',
      schedule: [
        { day: 1, opens: 480, closes: 1080 },
        { day: 2, opens: 480, closes: 1080 },
        { day: 3, opens: 480, closes: 1080 },
        { day: 4, opens: 480, closes: 1080 },
        { day: 5, opens: 480, closes: 1080 },
        { day: 6, opens: 480, closes: 720 },
      ],
      services: ['Reformas', 'Projetos', 'Brita e areia'],
      products: [
        {
          name: 'Projeto residencial',
          description: 'Projeto completo com planta e memorial',
          price: 4500,
        },
        {
          name: 'Reforma de banheiro',
          description: 'Demolição, hidráulica e elétrica',
          price: 12800,
        },
      ],
    },
    {
      name: 'Restaurante Sabor & Arte',
      slug: 'restaurante-sabor-arte',
      description: 'Comida caseira, pizzas artesanais e marmitex para almoço.',
      category: categoriaPorSlug.get('alimentacao'),
      phone: '+55 85 99999-0002',
      whatsapp: '+55 85 99999-0002',
      address: 'Rua das Flores, 300 — Centro',
      city: casteloId,
      isFeatured: true,
      rating: 4.5,
      ratingCount: 214,
      isVerified: true,
      instagram: '@saborarte',
      schedule: [
        { day: 0, opens: 660, closes: 1380 },
        { day: 1, opens: 660, closes: 1380 },
        { day: 2, opens: 660, closes: 1380 },
        { day: 3, opens: 660, closes: 1380 },
        { day: 4, opens: 660, closes: 1380 },
        { day: 5, opens: 660, closes: 1380 },
        { day: 6, opens: 660, closes: 1380 },
      ],
      services: ['Delivery', 'Salão', 'Marmitex'],
      products: [
        {
          name: 'Pizza artesanal',
          description: 'Massa de fermentação lenta, 4 sabores',
          price: 59.9,
        },
        { name: 'Marmitex do dia', description: 'Prato feito com accompanyamentos', price: 24.9 },
      ],
    },
    {
      name: 'Oficina do Zé',
      slug: 'oficina-do-ze',
      description: 'Mecânica automotiva em geral, revisão e troca de óleo.',
      category: categoriaPorSlug.get('oficina'),
      phone: '+55 85 99999-0003',
      address: 'Rua do Campo, 45 — Centro',
      city: casteloId,
      rating: 4.2,
      ratingCount: 87,
      instagram: '@oficinadoze',
      schedule: [
        { day: 1, opens: 480, closes: 1080 },
        { day: 2, opens: 480, closes: 1080 },
        { day: 3, opens: 480, closes: 1080 },
        { day: 4, opens: 480, closes: 1080 },
        { day: 5, opens: 480, closes: 1080 },
        { day: 6, opens: 480, closes: 1080 },
      ],
      services: ['Troca de óleo', 'Suspensão', 'Freios'],
      products: [
        { name: 'Troca de óleo', description: 'Até 4L de óleo e filtro novos', price: 149 },
        { name: 'Revisão completa', description: 'Checklist de 30 itens', price: 290 },
      ],
    },
    {
      name: 'Drogaria Popular',
      slug: 'drogaria-popular',
      description: 'Farmácia de plantão 24 horas, com manipulação e entregas.',
      category: categoriaPorSlug.get('farmacia'),
      phone: '+55 85 99999-0004',
      whatsapp: '+55 85 99999-0004',
      address: 'Av. Antônio Sales, 910 — Centro',
      city: casteloId,
      rating: 4.8,
      ratingCount: 356,
      isVerified: true,
      website: 'https://drogariapopular.com.br',
      facebook: 'https://facebook.com/drogariapopular',
      schedule: [
        { day: 0, opens: 0, closes: 1439 },
        { day: 1, opens: 0, closes: 1439 },
        { day: 2, opens: 0, closes: 1439 },
        { day: 3, opens: 0, closes: 1439 },
        { day: 4, opens: 0, closes: 1439 },
        { day: 5, opens: 0, closes: 1439 },
        { day: 6, opens: 0, closes: 1439 },
      ],
      services: ['Plantão', 'Entrega', 'Medidas de pressão'],
      products: [
        {
          name: 'Consulta com o farmacêutico',
          description: 'R$ 0,00 em cópia do convênio',
          price: 0,
        },
      ],
    },
    {
      name: 'Barbearia Central',
      slug: 'barbearia-central',
      description: 'Cortes, barba e grooming com horário agendado.',
      category: categoriaPorSlug.get('beleza'),
      phone: '+55 85 99999-0005',
      whatsapp: '+55 85 99999-0005',
      address: 'Rua Padre Morais, 77 — Centro',
      city: casteloId,
      rating: 4.9,
      ratingCount: 512,
      isVerified: true,
      website: 'https://barbeariacentral.com.br',
      instagram: '@barbeariacentral',
      facebook: 'https://facebook.com/barbeariacentral',
      schedule: [
        { day: 0, opens: 540, closes: 1200 },
        { day: 2, opens: 540, closes: 1200 },
        { day: 3, opens: 540, closes: 1200 },
        { day: 4, opens: 540, closes: 1200 },
        { day: 5, opens: 540, closes: 1200 },
        { day: 6, opens: 540, closes: 1200 },
      ],
      services: ['Corte', 'Barba', 'Pigmentação'],
      products: [
        { name: 'Corte social', description: 'Corte + barba + escovação', price: 45 },
        { name: 'Platinado', description: 'Descoloração global com matização', price: 180 },
        { name: 'Barba terapia', description: 'Toalha quente, oil e finalizado', price: 35 },
      ],
    },
    {
      name: 'Hospital Nilo Lima',
      slug: 'hospital-nilo-lima',
      description: 'Pronto atendimento municipal de Castelo do Piauí.',
      category: categoriaPorSlug.get('saude'),
      phone: '+55 86 3000-0000',
      whatsapp: '+55 86 3000-0000',
      address: 'Av. Principal, s/n — Centro',
      city: casteloId,
      isVerified: true,
      schedule: [
        { day: 0, opens: 0, closes: 1439 },
        { day: 1, opens: 0, closes: 1439 },
        { day: 2, opens: 0, closes: 1439 },
        { day: 3, opens: 0, closes: 1439 },
        { day: 4, opens: 0, closes: 1439 },
        { day: 5, opens: 0, closes: 1439 },
        { day: 6, opens: 0, closes: 1439 },
      ],
      services: ['Pronto atendimento', 'Emergência', 'Ambulatório'],
    },
    {
      name: 'Escola Saber & Crescer',
      slug: 'escola-saber-crescer',
      description: 'Escola particular de educação infantil e ensino fundamental, com atividades extracurriculares e aulas de reforço.',
      category: categoriaPorSlug.get('servicos'),
      phone: '+55 86 3333-1001',
      whatsapp: '+55 86 3333-1001',
      address: 'Rua das Acácias, 410 — Bairro Novo',
      city: casteloId,
      rating: 4.6,
      ratingCount: 92,
      isVerified: true,
      instagram: '@escolasabercrescer',
      schedule: [
        { day: 1, opens: 420, closes: 1020 },
        { day: 2, opens: 420, closes: 1020 },
        { day: 3, opens: 420, closes: 1020 },
        { day: 4, opens: 420, closes: 1020 },
        { day: 5, opens: 420, closes: 1020 },
      ],
      services: ['Educação infantil', 'Ensino fundamental', 'Reforço escolar'],
    },
    {
      name: 'Banco do Nordeste — Agência Castelo',
      slug: 'banco-do-nordeste-castelo',
      description: 'Agência do Banco do Nordeste com atendimento a pessoa física e jurídica, crédito rural e microcrédito.',
      category: categoriaPorSlug.get('servicos'),
      phone: '+55 86 3333-2000',
      address: 'Av. Getúlio Vargas, 120 — Centro',
      city: casteloId,
      rating: 4.1,
      ratingCount: 156,
      isVerified: true,
      schedule: [
        { day: 1, opens: 540, closes: 1020 },
        { day: 2, opens: 540, closes: 1020 },
        { day: 3, opens: 540, closes: 1020 },
        { day: 4, opens: 540, closes: 1020 },
        { day: 5, opens: 540, closes: 1020 },
      ],
      services: ['Conta corrente', 'Crédito rural', 'Microcrédito'],
    },
    {
      name: 'Mercado Central Teresina',
      slug: 'mercado-central-teresina',
      description: 'Mercado público de Teresina com artesanato, comidas típicas e produtos regionais.',
      category: categoriaPorSlug.get('alimentacao'),
      phone: '+55 86 3222-1000',
      whatsapp: '+55 86 3222-1000',
      address: 'Praça Saraiva, s/n — Centro',
      city: cidadePorSlug.get('teresina'),
      rating: 4.4,
      ratingCount: 890,
      isVerified: true,
      instagram: '@mercadocentralthe',
      schedule: [
        { day: 0, opens: 420, closes: 1080 },
        { day: 1, opens: 420, closes: 1080 },
        { day: 2, opens: 420, closes: 1080 },
        { day: 3, opens: 420, closes: 1080 },
        { day: 4, opens: 420, closes: 1080 },
        { day: 5, opens: 420, closes: 1080 },
        { day: 6, opens: 420, closes: 1080 },
      ],
      services: ['Artesanato', 'Comida típica', 'Produtos regionais'],
    },
    {
      name: 'Clínica Saúde & Vida',
      slug: 'clinica-saude-vida-teresina',
      description: 'Clínica médica multiespecialidade em Teresina, com consultas e exames.',
      category: categoriaPorSlug.get('saude'),
      phone: '+55 86 3222-2000',
      whatsapp: '+55 86 3222-2000',
      address: 'Av. Frei Serafim, 1500 — Centro',
      city: cidadePorSlug.get('teresina'),
      rating: 4.7,
      ratingCount: 230,
      isVerified: true,
      website: 'https://clinicasaudevida.com.br',
      schedule: [
        { day: 1, opens: 480, closes: 1080 },
        { day: 2, opens: 480, closes: 1080 },
        { day: 3, opens: 480, closes: 1080 },
        { day: 4, opens: 480, closes: 1080 },
        { day: 5, opens: 480, closes: 1080 },
      ],
      services: ['Clínica geral', 'Cardiologia', 'Pediatria'],
    },
  ];
  let empresaPorSlug = new Map();
  if (!casteloId) {
    console.log('Cidade padrao nao encontrada; pulando empresas');
  } else {
    const inseridasEmpresas = await insertIfMissing(CompanyModel, empresas, 'slug');
    console.log(`Empresas inseridas: ${inseridasEmpresas}`);
    empresaPorSlug = new Map(
      (await CompanyModel.find().lean()).map((empresa) => [empresa.slug, empresa._id]),
    );
  }

  const banners = [
    {
      title: 'Promoções da Semana',
      subtitle: 'Ofertas perto de você',
      order: 1,
      active: true,
    },
    {
      title: 'Anuncie Aqui',
      subtitle: 'Alcance milhares de clientes',
      order: 2,
      active: true,
    },
    {
      title: 'Festival Gastronômico',
      subtitle: '10 a 18 de maio',
      order: 3,
      active: true,
    },
  ];

  const inseridosBanners = await insertIfMissing(BannerModel, banners, 'title');
  console.log(`Banners inseridos: ${inseridosBanners}`);

  const cupons = [
    {
      title: '20% OFF em Pizzas',
      company: empresaPorSlug.get('restaurante-sabor-arte'),
      code: 'PIZZA20',
      discount: '20%',
      description: 'Válido para pizzas de qualquer tamanho, no salão ou delivery.',
    },
    {
      title: 'Troca de óleo grátis',
      company: empresaPorSlug.get('oficina-do-ze'),
      code: 'OLEOGRATIS',
      description: 'Troca de óleo sem custo na compra do filtro com a Oficina do Zé.',
    },
    {
      title: '30% OFF no corte',
      company: empresaPorSlug.get('barbearia-central'),
      code: 'CORTE30',
      discount: '30%',
      description: 'Válido para o primeiro corte na Barbearia Central.',
    },
    {
      title: '10% OFF em material de construção',
      company: empresaPorSlug.get('construtora-alicerce'),
      code: 'ALICERCE10',
      discount: '10%',
      description: 'Desconto em compras acima de R$ 500 na Construtora Alicerce.',
    },
    {
      title: 'Frete grátis na Drogaria Popular',
      company: empresaPorSlug.get('drogaria-popular'),
      code: 'FRETEGRATIS',
      description: 'Entrega gratuita para pedidos acima de R$ 30.',
    },
    {
      title: 'Café da manhã cortesia',
      company: empresaPorSlug.get('mercado-central-teresina'),
      code: 'CAFEGRATIS',
      description: 'Café da manhã cortesia na compra de qualquer produto regional.',
    },
  ];

  const inseridosCupons = await insertIfMissing(CouponModel, cupons, 'code');
  console.log(`Cupons inseridos: ${inseridosCupons}`);

  const vagas = [
    {
      title: 'Atendente de Loja',
      company: empresaPorSlug.get('drogaria-popular'),
      description: 'Atendimento ao cliente em drogaria, operação de caixa e reposição.',
      location: 'Centro, Castelo do Piauí',
      type: 'CLT',
    },
    {
      title: 'Mecânico Automotivo',
      company: empresaPorSlug.get('oficina-do-ze'),
      description: 'Revisão, suspensão e freios. Experiência comprovada.',
      location: 'Centro, Castelo do Piauí',
      type: 'CLT',
    },
    {
      title: 'Vendedor(a)',
      company: empresaPorSlug.get('construtora-alicerce'),
      description: 'Venda de materiais de construção e acompanhamento de orçamentos.',
      location: 'Centro, Castelo do Piauí',
      type: 'CLT',
    },
    {
      title: 'Recepcionista',
      company: empresaPorSlug.get('barbearia-central'),
      description: 'Agendamento de clientes e gestão da agenda da barbearia.',
      location: 'Centro, Castelo do Piauí',
      type: 'Meio período',
    },
    {
      title: 'Professor(a) de Reforço',
      company: empresaPorSlug.get('escola-saber-crescer'),
      description: 'Reforço escolar para ensino fundamental, matemática e português.',
      location: 'Bairro Novo, Castelo do Piauí',
      type: 'Meio período',
    },
    {
      title: 'Atendente de Caixa',
      company: empresaPorSlug.get('mercado-central-teresina'),
      description: 'Operação de caixa e atendimento ao cliente no mercado central.',
      location: 'Centro, Teresina',
      type: 'CLT',
    },
  ];

  const inseridasVagas = await insertIfMissing(JobModel, vagas, 'title');
  console.log(`Vagas inseridas: ${inseridasVagas}`);

  const profissionais = [
    {
      name: 'João Eletricista',
      slug: 'joao-eletricista',
      specialty: 'Eletricista residencial e comercial',
      description: 'Instalações, reparos e manutenção elétrica.',
      phone: '+55 85 99999-1001',
      whatsapp: '+55 85 99999-1001',
      city: casteloId,
      rating: 4.6,
      ratingCount: 32,
    },
    {
      name: 'Maria Pintora',
      slug: 'maria-pintora',
      specialty: 'Pintura residencial e comercial',
      description: 'Pintura interna e externa, texturas e grafiato.',
      phone: '+55 85 99999-1002',
      whatsapp: '+55 85 99999-1002',
      city: casteloId,
      rating: 4.8,
      ratingCount: 18,
    },
    {
      name: 'Carlos Pedreiro',
      slug: 'carlos-pedreiro',
      specialty: 'Pedreiro e reformas',
      description: 'Construção, reforma e acabamento.',
      phone: '+55 85 99999-1003',
      whatsapp: '+55 85 99999-1003',
      city: casteloId,
      rating: 4.4,
      ratingCount: 27,
    },
  ];
  const inseridosProfissionais = await insertIfMissing(AutonomousProfessionalModel, profissionais, 'slug');
  console.log(`Profissionais inseridos: ${inseridosProfissionais}`);

  const avisos = [
    {
      title: 'Campanha de vacinação contra a gripe',
      body: 'A vacinação contra a gripe está disponível no Hospital Nilo Lima e nas UBSs do município. Leve seu cartão de vacinas e documento com foto.',
      type: 'health',
      active: true,
    },
    {
      title: 'Manutenção na rede elétrica',
      body: 'A Equatorial realizará manutenção programada no bairro Centro no dia 10/11, das 08h às 12h. Haverá interrupção no fornecimento.',
      type: 'alert',
      active: true,
    },
    {
      title: 'Coleta de lixo — feriado',
      body: 'No feriado do dia 15, a coleta de lixo será antecipada para o dia 14. Deixe o lixo na calçada até as 07h.',
      type: 'general',
      active: true,
    },
    {
      title: 'Feira do Rio Poti — inscrições abertas',
      body: 'Artesãos e produtores podem se inscrever para a Feira do Rio Poti até o dia 20. Vagas limitadas.',
      type: 'event',
      active: true,
    },
    {
      title: 'Corte de energia programado',
      body: 'Manutenção na rede elétrica no bairro Novo, dia 18, das 09h às 13h.',
      type: 'alert',
      active: true,
    },
  ];
  const inseridosAvisos = await insertIfMissing(NoticeModel, avisos, 'title');
  console.log(`Avisos inseridos: ${inseridosAvisos}`);

  const servicosPublicos = [
    {
      name: 'Polícia Militar',
      description: 'Emergência em Castelo do Piauí',
      category: 'emergency',
      phone: '190',
      icon: 'shield-alert',
      city: casteloId,
      order: 1,
      active: true,
    },
    {
      name: 'Polícia Civil',
      description: 'Ocorrências e denúncias',
      category: 'civil',
      phone: '197',
      icon: 'shield-account',
      city: casteloId,
      order: 2,
      active: true,
    },
    {
      name: 'Hospital Nilo Lima',
      description: 'Pronto atendimento municipal',
      category: 'health',
      details: [
        'O telefone direto da unidade ainda não foi cadastrado.',
        'Consulte a escala de plantão na recepção do hospital.',
        'Em emergências, acione o SAMU pelo 192.',
      ],
      icon: 'hospital-building',
      city: casteloId,
      order: 3,
      active: true,
    },
    {
      name: 'Coleta de Lixo',
      description: 'Dias e horários por bairro',
      category: 'sanitation',
      details: [
        'O cronograma por bairro ainda não foi cadastrado.',
        'Consulte a Secretaria de Limpeza Urbana do município para confirmar dias e horários.',
      ],
      icon: 'trash-can',
      city: casteloId,
      order: 4,
      active: true,
    },
  ];
  const inseridosServicos = await insertIfMissing(
    PublicUtilityModel,
    servicosPublicos,
    'name',
  );
  console.log(`Serviços públicos inseridos: ${inseridosServicos}`);

  // Turismo: `touristspots` guarda atrativos permanentes (cachoeira, praça,
  // monumento...) e `events` guarda eventos temporários (festival, feira...).
  // Ambos dependem da cidade padrão; as coordenadas abaixo são APROXIMADAS de
  // Castelo do Piauí (centro ≈ -7.2833, -43.0167), obtidas de referências
  // públicas da região — não são medidas precisas de GPS.
  const atracoes = [
    {
      name: 'Parque Natural Municipal Pedra do Castelo',
      slug: 'parque-natural-pedra-do-castelo',
      description:
        'Unidade de conservação municipal em torno da Pedra do Castelo, com trilhas e mirantes. Principal cartão-postal de Castelo do Piauí.',
      category: 'park',
      address: 'Zona rural de Castelo do Piauí',
      city: casteloId,
      latitude: -7.31,
      longitude: -43.04,
      entryFee: 'free',
      featured: true,
      active: true,
      order: 1,
    },
    {
      name: 'Cânion do Rio Poti',
      slug: 'canyon-do-rio-poti',
      description:
        'Paredões rochosos e águas do Rio Poti esculpindo um cânion no sertão, com banho de rio e paisagens para fotografia.',
      category: 'nature',
      address: 'Rio Poti, zona rural de Castelo do Piauí',
      city: casteloId,
      latitude: -7.32,
      longitude: -43.06,
      entryFee: 'free',
      active: true,
      order: 2,
    },
    {
      name: 'Cachoeiras do rio Poti',
      slug: 'cachoeiras-do-rio-poti',
      description:
        'Sequência de cachoeiras e poços do Rio Poti, procurada para banho e descanso nos fins de semana.',
      category: 'waterfall',
      address: 'Rio Poti, zona rural de Castelo do Piauí',
      city: casteloId,
      latitude: -7.25,
      longitude: -43.05,
      entryFee: 'free',
      active: true,
      order: 3,
    },
    {
      name: 'Palácio dos Viscondes de Parnaíba',
      slug: 'palacio-dos-viscondes-de-parnaiba',
      description:
        'Espaço cultural e monumento no centro da cidade, abrigando exposições e memórias da história de Castelo do Piauí.',
      category: 'monument',
      address: 'Centro, Castelo do Piauí',
      city: casteloId,
      latitude: -7.2833,
      longitude: -43.0167,
      entryFee: 'free',
      active: true,
      order: 4,
    },
    {
      name: 'Encontro dos Rios (Poti e Parnaíba)',
      slug: 'encontro-dos-rios-poti-parnaiba',
      description:
        'Ponto turístico onde o Rio Poti encontra o Rio Parnaíba, com mirante e área de lazer.',
      category: 'nature',
      address: 'Zona Norte, Teresina',
      city: cidadePorSlug.get('teresina'),
      latitude: -5.05,
      longitude: -42.8,
      entryFee: 'free',
      featured: true,
      active: true,
      order: 1,
    },
    {
      name: 'Parque da Cidadania',
      slug: 'parque-da-cidadania-teresina',
      description: 'Parque urbano com trilhas, lago e área de convivência no centro de Teresina.',
      category: 'park',
      address: 'Centro, Teresina',
      city: cidadePorSlug.get('teresina'),
      latitude: -5.089,
      longitude: -42.802,
      entryFee: 'free',
      active: true,
      order: 2,
    },
  ];

  // Eventos com datas dinâmicas: o festival fica no futuro (aparece como
  // "em breve") e a feira fica hoje (aparece como "acontecendo"). O slug
  // inclui o ano da data, então rodar o seed de novo no mesmo ano não duplica.
  const hoje = new Date();
  const inicioFestival = somarDias(hoje, 30);
  const segundoDiaFestival = somarDias(inicioFestival, 1);
  const fimFestival = somarDias(inicioFestival, 2);
  const inicioFeira = hoje;

  if (!casteloId) {
    console.log('Cidade padrao nao encontrada; pulando pontos turisticos e eventos');
  } else {
    const inseridasAtracoes = await insertIfMissing(TouristSpotModel, atracoes, 'slug');
    console.log(`Pontos turísticos inseridos: ${inseridasAtracoes}`);

    // A programação do festival referencia as atrações pelo id (o schema do
    // item guarda ObjectId, não slug) — resolve os ids das atrações já
    // inseridas acima.
    const idsDasAtracoes = await idsAtracoesPorSlug(
      atracoes.map((atracao) => atracao.slug),
    );

    const eventos = montarEventosTuristicos(
      {
        inicioFestival: formatarDataISO(inicioFestival),
        segundoDiaFestival: formatarDataISO(segundoDiaFestival),
        fimFestival: formatarDataISO(fimFestival),
        inicioFeira: formatarDataISO(inicioFeira),
      },
      casteloId,
      idsDasAtracoes,
    );

    const inseridosEventos = await insertIfMissing(TourEventModel, eventos, 'slug');
    console.log(`Eventos turísticos inseridos (Castelo): ${inseridosEventos}`);

    // Eventos de Teresina (segunda cidade) — usa as atrações de Teresina já
    // inseridas acima (os ids vêm do mesmo mapa de slugs).
    const teresinaId = cidadePorSlug.get('teresina');
    if (teresinaId) {
      const eventosTeresina = montarEventosTuristicosTeresina(
        {
          inicioFestival: formatarDataISO(inicioFestival),
          segundoDiaFestival: formatarDataISO(segundoDiaFestival),
          fimFestival: formatarDataISO(fimFestival),
          inicioFeira: formatarDataISO(inicioFeira),
        },
        teresinaId,
        idsDasAtracoes,
      );
      const inseridosEventosTeresina = await insertIfMissing(
        TourEventModel,
        eventosTeresina,
        'slug',
      );
      console.log(`Eventos turísticos inseridos (Teresina): ${inseridosEventosTeresina}`);
    }
  }
}

async function main(): Promise<void> {
  await connectDatabase();
  await seed();
  await mongoose.disconnect();
  console.log('Seed concluído');
}

main().catch((error) => {
  console.error('Falha no seed:', error);
  process.exit(1);
});
