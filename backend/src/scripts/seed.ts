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
import { CouponModel } from '../models/coupon.model.js';
import { JobModel } from '../models/job.model.js';

const shouldReset = process.argv.includes('--reset');

/** Insere apenas os documentos cuja chave natural ainda não existe no banco. */
async function insertIfMissing<T>(
  model: mongoose.Model<T>,
  documents: Record<string, unknown>[],
  uniqueField: string,
): Promise<number> {
  const fresh = [];
  for (const doc of documents) {
    const exists = await model.exists({ [uniqueField]: doc[uniqueField] });
    if (!exists) fresh.push(doc);
  }
  if (fresh.length > 0) {
    await model.create(fresh as Parameters<typeof model.create>[0]);
  }
  return fresh.length;
}

async function seed(): Promise<void> {
  if (shouldReset) {
    await Promise.all([
      CategoryModel.deleteMany({}),
      CompanyModel.deleteMany({}),
      BannerModel.deleteMany({}),
      CouponModel.deleteMany({}),
      JobModel.deleteMany({}),
    ]);
    console.log('Coleções limpas (--reset)');
  }

  const categorias = [
    { name: 'Construção', slug: 'construcao', icon: 'hammer', order: 1 },
    { name: 'Alimentação', slug: 'alimentacao', icon: 'silverware-fork-knife', order: 2 },
    { name: 'Oficina', slug: 'oficina', icon: 'car-wrench', order: 3 },
    { name: 'Farmácia', slug: 'farmacia', icon: 'pill', order: 4 },
    { name: 'Beleza', slug: 'beleza', icon: 'content-cut', order: 5 },
    { name: 'Serviços', slug: 'servicos', icon: 'tools', order: 6 },
  ];

  const inseridas = await insertIfMissing(CategoryModel, categorias, 'slug');
  console.log(`Categorias inseridas: ${inseridas}`);

  const categoriaPorSlug = new Map(
    (await CategoryModel.find().lean()).map((categoria) => [categoria.slug, categoria._id]),
  );

  const empresas = [
    {
      name: 'Construtora Alicerce',
      slug: 'construtora-alicerce',
      description: 'Construção civil, reformas e projetos residenciais e comerciais.',
      category: categoriaPorSlug.get('construcao'),
      phone: '+55 85 99999-0001',
      whatsapp: '+55 85 99999-0001',
      address: 'Av. Brasil, 1520 — Centro',
      city: 'Fortaleza',
      isFeatured: true,
      rating: 4.7,
      ratingCount: 128,
      isVerified: true,
      website: 'https://construtoraalicerce.com.br',
      instagram: '@construtoraalicerce',
      facebook: 'https://facebook.com/construtoraalicerce',
      openingHours: ['Seg a Sex: 08h às 18h', 'Sáb: 08h às 12h'],
      services: ['Reformas', 'Projetos', 'Brita e areia'],
      products: [
        { name: 'Projeto residencial', description: 'Projeto completo com planta e memorial', price: 4500 },
        { name: 'Reforma de banheiro', description: 'Demolição, hidráulica e elétrica', price: 12800 },
      ],
    },
    {
      name: 'Restaurante Sabor & Arte',
      slug: 'restaurante-sabor-arte',
      description: 'Comida caseira, pizzas artesanais e marmitex para almoço.',
      category: categoriaPorSlug.get('alimentacao'),
      phone: '+55 85 99999-0002',
      whatsapp: '+55 85 99999-0002',
      address: 'Rua das Flores, 300 — Aldeota',
      city: 'Fortaleza',
      isFeatured: true,
      rating: 4.5,
      ratingCount: 214,
      isVerified: true,
      instagram: '@saborarte',
      openingHours: ['Todos os dias: 11h às 23h'],
      services: ['Delivery', 'Salão', 'Marmitex'],
      products: [
        { name: 'Pizza artesanal', description: 'Massa de fermentação lenta, 4 sabores', price: 59.9 },
        { name: 'Marmitex do dia', description: 'Prato feito com accompanyamentos', price: 24.9 },
      ],
    },
    {
      name: 'Oficina do Zé',
      slug: 'oficina-do-ze',
      description: 'Mecânica automotiva em geral, revisão e troca de óleo.',
      category: categoriaPorSlug.get('oficina'),
      phone: '+55 85 99999-0003',
      address: 'Rua do Campo, 45 — Montese',
      city: 'Fortaleza',
      rating: 4.2,
      ratingCount: 87,
      instagram: '@oficinadoze',
      openingHours: ['Seg a Sáb: 08h às 18h'],
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
      address: 'Av. Antônio Sales, 910 — Dionísio Torres',
      city: 'Fortaleza',
      rating: 4.8,
      ratingCount: 356,
      isVerified: true,
      website: 'https://drogariapopular.com.br',
      facebook: 'https://facebook.com/drogariapopular',
      openingHours: ['Todos os dias: 00h às 23h59'],
      services: ['Plantão', 'Entrega', 'Medidas de pressão'],
      products: [
        { name: 'Consulta com o farmacêutico', description: 'R$ 0,00 em cópia do convênio', price: 0 },
      ],
    },
    {
      name: 'Barbearia Central',
      slug: 'barbearia-central',
      description: 'Cortes, barba e grooming com horário agendado.',
      category: categoriaPorSlug.get('beleza'),
      phone: '+55 85 99999-0005',
      whatsapp: '+55 85 99999-0005',
      address: 'Rua Padre Morais, 77 — Meireles',
      city: 'Fortaleza',
      rating: 4.9,
      ratingCount: 512,
      isVerified: true,
      website: 'https://barbeariacentral.com.br',
      instagram: '@barbeariacentral',
      facebook: 'https://facebook.com/barbeariacentral',
      openingHours: ['Ter a Dom: 09h às 20h'],
      services: ['Corte', 'Barba', 'Pigmentação'],
      products: [
        { name: 'Corte social', description: 'Corte + barba + escovação', price: 45 },
        { name: 'Platinado', description: 'Descoloração global com matização', price: 180 },
        { name: 'Barba terapia', description: 'Toalha quente, oil e finalizado', price: 35 },
      ],
    },
  ];

  const inseridasEmpresas = await insertIfMissing(CompanyModel, empresas, 'slug');
  console.log(`Empresas inseridas: ${inseridasEmpresas}`);

  const empresaPorSlug = new Map(
    (await CompanyModel.find().lean()).map((empresa) => [empresa.slug, empresa._id]),
  );

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
  ];

  const inseridosCupons = await insertIfMissing(CouponModel, cupons, 'code');
  console.log(`Cupons inseridos: ${inseridosCupons}`);

  const vagas = [
    {
      title: 'Atendente de Loja',
      company: empresaPorSlug.get('drogaria-popular'),
      description: 'Atendimento ao cliente em drogaria, operação de caixa e reposição.',
      location: 'Dionísio Torres, Fortaleza',
      type: 'CLT',
    },
    {
      title: 'Mecânico Automotivo',
      company: empresaPorSlug.get('oficina-do-ze'),
      description: 'Revisão, suspensão e freios. Experiência comprovada.',
      location: 'Montese, Fortaleza',
      type: 'CLT',
    },
    {
      title: 'Vendedor(a)',
      company: empresaPorSlug.get('construtora-alicerce'),
      description: 'Venda de materiais de construção e acompanhamento de orçamentos.',
      location: 'Centro, Fortaleza',
      type: 'CLT',
    },
    {
      title: 'Recepcionista',
      company: empresaPorSlug.get('barbearia-central'),
      description: 'Agendamento de clientes e gestão da agenda da barbearia.',
      location: 'Meireles, Fortaleza',
      type: 'Meio período',
    },
  ];

  const inseridasVagas = await insertIfMissing(JobModel, vagas, 'title');
  console.log(`Vagas inseridas: ${inseridasVagas}`);
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
