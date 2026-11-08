/**
 * Dados mockados enquanto o backend não está no ar ou env EXPO_PUBLIC_API_URL
 * não está configurada. Tipados pelos tipos de domínio (src/types/domain.ts).
 */
import type { Banner, Category, Company, Coupon, Job, TourEvent, TouristSpot } from '@/types/domain';

/** Banner com apresentação extra usada só no app (emoji/cor do card). */
export type DisplayBanner = Banner & { emoji?: string; color?: string };
export type DisplayCoupon = Coupon & { color?: string };

export const MOCK_CATEGORIES: Category[] = [
  { _id: '1', name: 'Construção', slug: 'construcao', icon: 'hammer' },
  { _id: '2', name: 'Alimentação', slug: 'alimentacao', icon: 'silverware-fork-knife' },
  { _id: '3', name: 'Oficina', slug: 'oficina', icon: 'car-wrench' },
  { _id: '4', name: 'Farmácia', slug: 'farmacia', icon: 'pill' },
  { _id: '5', name: 'Beleza', slug: 'beleza', icon: 'content-cut' },
  { _id: '6', name: 'Serviços', slug: 'servicos', icon: 'tools' },
  { _id: '7', name: 'Outros', slug: 'outros', icon: 'dots-horizontal-circle' },
];

export const MOCK_BANNERS: DisplayBanner[] = [
  {
    _id: '1',
    title: 'Promoções da Semana',
    subtitle: 'Ofertas perto de você',
    emoji: '🔥',
    color: '#7C5C00',
    active: true,
    order: 1,
  },
  {
    _id: '2',
    title: 'Anuncie Aqui',
    subtitle: 'Alcance milhares de clientes',
    emoji: '📢',
    color: '#3D3A8C',
    active: true,
    order: 2,
  },
  {
    _id: '3',
    title: 'Festival Gastronômico',
    subtitle: '10 a 18 de maio',
    emoji: '🍔',
    color: '#8C2F3D',
    active: true,
    order: 3,
  },
];

export const MOCK_COMPANIES: Company[] = [
  {
    _id: '1',
    name: 'Construtora Alicerce',
    slug: 'construtora-alicerce',
    description:
      'Fundada em 2008, a Construtora Alicerce nasceu com o propósito de transformar a forma de construir em Castelo do Piauí. Ao longo de mais de uma década, ajudamos famílias e empresas a tirar projetos do papel, unindo planejamento, qualidade e respeito aos prazos. Nossa missão é construir espaços seguros, funcionais e duradouros, sempre com transparência e atenção às pessoas.',
    category: '1',
    address: 'Av. Brasil, 1520 — Centro',
    city: 'Castelo do Piauí',
    registry: 'CREA-PI',
    isFeatured: true,
    rating: 4.7,
    ratingCount: 128,
    isVerified: true,
    phone: '+5511999990001',
    whatsapp: '5511999990001',
    website: 'https://construtoraalicerce.com.br',
    instagram: '@construtoraalicerce',
    facebook: 'https://facebook.com/construtoraalicerce',
    schedule: [{day:1,opens:480,closes:1080},{day:2,opens:480,closes:1080},{day:3,opens:480,closes:1080},{day:4,opens:480,closes:1080},{day:5,opens:480,closes:1080},{day:6,opens:480,closes:720}],
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
    _id: '2',
    name: 'Restaurante Sabor & Arte',
    slug: 'restaurante-sabor-arte',
    description: 'Cozinha caseira e pizzas artesanais.',
    category: '2',
    phone: '+5511999990002',
    whatsapp: '5511999990002',
    address: 'Rua das Flores, 30 — Centro',
    rating: 4.5,
    ratingCount: 214,
    isVerified: true,
    instagram: '@saborarte',
    schedule: [0,1,2,3,4,5,6].map((d)=>({day:d,opens:660,closes:1380})),
    services: ['Delivery', 'Salão', 'Marmitex'],
    products: [
      {
        name: 'Pizza artesanal',
        description: 'Massa de fermentação lenta, 4 sabores',
        price: 59.9,
      },
      { name: 'Marmitex do dia', description: 'Prato feito com acompanhamentos', price: 24.9 },
    ],
  },
  {
    _id: '3',
    name: 'Oficina do Zé',
    slug: 'oficina-do-ze',
    description: 'Mecânica em geral e troca de óleo.',
    category: '3',
    phone: '+5511999990003',
    address: 'Av. das Oficinas, 210',
    rating: 4.2,
    ratingCount: 87,
    instagram: '@oficinadoze',
    schedule: [1,2,3,4,5,6].map((d)=>({day:d,opens:480,closes:1080})),
    services: ['Troca de óleo', 'Suspensão', 'Freios'],
    products: [
      { name: 'Troca de óleo', description: 'Até 4L de óleo e filtro novos', price: 149 },
      { name: 'Revisão completa', description: 'Checklist de 30 itens', price: 290 },
    ],
  },
  {
    _id: '4',
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    description: 'Cortes clássicos e modernos.',
    category: '5',
    phone: '+5511999990004',
    whatsapp: '5511999990004',
    address: 'Rua XV de Novembro, 88',
    rating: 4.9,
    ratingCount: 512,
    isVerified: true,
    website: 'https://barbeariacentral.com.br',
    instagram: '@barbeariacentral',
    facebook: 'https://facebook.com/barbeariacentral',
    schedule: [0,2,3,4,5,6].map((d)=>({day:d,opens:540,closes:1200})),
    services: ['Corte', 'Barba', 'Pigmentação'],
    products: [
      { name: 'Corte social', description: 'Corte + barba + escovação', price: 45 },
      { name: 'Platinado', description: 'Descoloração global com matização', price: 180 },
    ],
  },
  {
    _id: '5',
    name: 'Drogaria Popular',
    slug: 'drogaria-popular',
    description: 'Farmácia de plantão 24h.',
    category: '4',
    phone: '+5511999990005',
    whatsapp: '5511999990005',
    address: 'Av. Brasil, 300 — Centro',
    rating: 4.8,
    ratingCount: 356,
    isVerified: true,
    website: 'https://drogariapopular.com.br',
    facebook: 'https://facebook.com/drogariapopular',
    schedule: [0,1,2,3,4,5,6].map((d)=>({day:d,opens:0,closes:1439})),
    services: ['Plantão', 'Entrega', 'Medidas de pressão'],
    products: [
      {
        name: 'Consulta com o farmacêutico',
        description: 'R$ 0,00 em cópia do convênio',
        price: 0,
      },
    ],
  },
];

export const MOCK_COUPONS: DisplayCoupon[] = [
  {
    _id: '1',
    title: '20% OFF em Pizzas',
    code: 'PIZZA20',
    discount: '20%',
    company: MOCK_COMPANIES[1],
    color: '#5C4033',
  },
  {
    _id: '2',
    title: 'Troca de óleo grátis',
    code: 'OLEOGRATIS',
    company: MOCK_COMPANIES[2],
    color: '#2F4858',
  },
  {
    _id: '3',
    title: '30% OFF no corte',
    code: 'CORTE30',
    discount: '30%',
    company: MOCK_COMPANIES[3],
    color: '#4A3F6B',
  },
];

export const MOCK_JOBS: Job[] = [
  {
    _id: '1',
    title: 'Atendente de Loja',
    company: 'Mercado Bom Preço',
    type: 'CLT',
    location: 'Centro',
  },
  {
    _id: '2',
    title: 'Mecânico Automotivo',
    company: 'Auto Center Silva',
    type: 'CLT',
    location: 'Zona Oeste',
  },
  {
    _id: '3',
    title: 'Vendedor(a)',
    company: 'Movelaria Popular',
    type: 'CLT',
  },
  {
    _id: '4',
    title: 'Recepcionista',
    company: 'Clínica Vida Plena',
    type: 'Part-time',
  },
];

export const MOCK_PHARMACY: Company =
  MOCK_COMPANIES.find((company) => company.slug === 'drogaria-popular') ?? MOCK_COMPANIES[4];

export const MOCK_FEATURED_COMPANY: Company =
  MOCK_COMPANIES.find((company) => company.isFeatured) ?? MOCK_COMPANIES[0];

/** `Date` → `YYYY-MM-DD` (horário local). O mock usa Date só para FORMATAR a
 * data; a comparação de dias é lexicográfica e mora em tourism-view. */
function dataISO(unidade: Date): string {
  const ano = String(unidade.getFullYear());
  const mes = String(unidade.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}-${String(unidade.getDate()).padStart(2, '0')}`;
}

function somarDias(base: Date, dias: number): Date {
  const resultado = new Date(base);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

/** Eventos do mock com datas dinâmicas: festival no futuro ("Em breve") e feira hoje ("Hoje"). */
const hojeMock = new Date();
const inicioFestival = somarDias(hojeMock, 30);
const segundoDiaFestival = somarDias(inicioFestival, 1);
const fimFestival = somarDias(inicioFestival, 2);

/** Mesmos nomes/slugs do seed do backend (seed.ts), para a Home bater com o banco real. */
export const MOCK_TOURIST_SPOTS: TouristSpot[] = [
  {
    _id: 'tur-1',
    name: 'Parque Natural Municipal Pedra do Castelo',
    slug: 'parque-natural-pedra-do-castelo',
    description:
      'Unidade de conservação municipal em torno da Pedra do Castelo, com trilhas e mirantes. Principal cartão-postal de Castelo do Piauí.',
    category: 'park',
    city: 'Castelo do Piauí',
    entryFee: 'free',
    featured: true,
    active: true,
    order: 1,
  },
  {
    _id: 'tur-2',
    name: 'Cânion do Rio Poti',
    slug: 'canyon-do-rio-poti',
    description:
      'Paredões rochosos e águas do Rio Poti esculpindo um cânion no sertão, com banho de rio e paisagens para fotografia.',
    category: 'nature',
    city: 'Castelo do Piauí',
    entryFee: 'free',
    active: true,
    order: 2,
  },
  {
    _id: 'tur-3',
    name: 'Cachoeiras do Rio Poti',
    slug: 'cachoeiras-do-rio-poti',
    description:
      'Sequência de cachoeiras e poços do Rio Poti, procurada para banho e descanso nos fins de semana.',
    category: 'waterfall',
    city: 'Castelo do Piauí',
    entryFee: 'free',
    active: true,
    order: 3,
  },
  {
    _id: 'tur-4',
    name: 'Palácio dos Viscondes de Parnaíba',
    slug: 'palacio-dos-viscondes-de-parnaiba',
    description:
      'Espaço cultural e monumento no centro da cidade, abrigando exposições e memórias da história de Castelo do Piauí.',
    category: 'monument',
    city: 'Castelo do Piauí',
    entryFee: 'free',
    active: true,
    order: 4,
  },
];

/** Slugs fixos coerentes (sem ano); datas relativas a hoje para o badge fizer sentido. */
/** Atrações do mock referenciadas pela programação do festival (por slug). */
const ATRACAO_CANION = MOCK_TOURIST_SPOTS.find((spot) => spot.slug === 'canyon-do-rio-poti');
const ATRACAO_CACHOEIRAS = MOCK_TOURIST_SPOTS.find((spot) => spot.slug === 'cachoeiras-do-rio-poti');

export const MOCK_EVENTS: TourEvent[] = [
  {
    _id: 'eve-1',
    name: 'Cânyon Fest Poti',
    slug: 'canyon-fest-poti',
    description:
      'Festival de três dias às margens do cânion, com exposição de animais, rodeio e corrida, além de shows à noite.',
    category: 'festival',
    startDate: dataISO(inicioFestival),
    endDate: dataISO(fimFestival),
    startTime: '10:00',
    endTime: '23:00',
    location: 'Cânion do Rio Poti',
    city: 'Castelo do Piauí',
    organizer: 'Organização Cânyon Fest Poti',
    ticket: 'free',
    featured: true,
    active: true,
    // Programação de 3 dias (mesma do seed do backend): 2+ itens por dia,
    // palcos distintos, referência a atrações e um item com ingresso próprio.
    schedule: [
      {
        date: dataISO(inicioFestival),
        startTime: '10:00',
        endTime: '12:00',
        title: 'Abertura e exposição de animais',
        description: 'Boas-vindas com fazenda experimental e venda de artesanato.',
        stage: 'Praça de Entrada',
      },
      {
        date: dataISO(inicioFestival),
        startTime: '16:00',
        endTime: '18:00',
        title: 'Caminhada-ecológica pelo cânion',
        description: 'Trilha guiada às margens do rio, com o guia do parque.',
        stage: 'Trilha do Cânion',
        relatedSpot: ATRACAO_CANION,
      },
      {
        date: dataISO(inicioFestival),
        startTime: '19:00',
        endTime: '22:00',
        title: 'Show de forró',
        stage: 'Palco Principal',
      },
      {
        date: dataISO(inicioFestival),
        title: 'Praça de alimentação',
        description: 'Barracas de comida típica e bebidas, sem horário fixo.',
        stage: 'Praça de Entrada',
      },
      {
        date: dataISO(segundoDiaFestival),
        startTime: '09:00',
        endTime: '12:00',
        title: 'Rodeio',
        stage: 'Pista do Cânion',
      },
      {
        date: dataISO(segundoDiaFestival),
        startTime: '14:00',
        endTime: '17:00',
        title: 'Banho de rio nas cachoeiras',
        stage: 'Margem do Rio Poti',
        relatedSpot: ATRACAO_CACHOEIRAS,
      },
      {
        date: dataISO(segundoDiaFestival),
        startTime: '20:00',
        endTime: '23:00',
        title: 'Show de quadrilha',
        stage: 'Palco Principal',
      },
      {
        date: dataISO(fimFestival),
        startTime: '10:00',
        endTime: '13:00',
        title: 'Corrida de canoas',
        stage: 'Rio Poti',
        ticket: 'paid',
        ticketPrice: 'R$ 25,00',
      },
      {
        date: dataISO(fimFestival),
        startTime: '16:00',
        endTime: '18:00',
        title: 'Encerramento e premiações',
        stage: 'Praça do Cânion',
      },
    ],
  },
  {
    _id: 'eve-2',
    name: 'Feira do Rio Poti',
    slug: 'feira-do-rio-poti',
    description:
      'Feira de produtores e artesãos da região do Rio Poti, com comida típica e apresentações culturais na praça.',
    category: 'fair',
    startDate: dataISO(hojeMock),
    endDate: dataISO(hojeMock),
    location: 'Praça do Centro',
    city: 'Castelo do Piauí',
    ticket: 'free',
    active: true,
  },
];
