/**
 * Dados mockados enquanto o backend não está no ar ou env EXPO_PUBLIC_API_URL
 * não está configurada. Tipados pelos tipos de domínio (src/types/domain.ts).
 */
import type { Banner, Category, Company, Coupon, Job } from '@/types/domain';

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
    description: 'Construção e reformas residenciais e comerciais.',
    category: '1',
    address: 'Av. Brasil, 1520 — Centro',
    city: 'Sua Cidade',
    isFeatured: true,
    rating: 4.7,
    phone: '+5511999990001',
    whatsapp: '5511999990001',
    openingHours: ['Seg–Sex 08h–18h', 'Sáb 08h–12h'],
  },
  {
    _id: '2',
    name: 'Restaurante Sabor & Arte',
    slug: 'restaurante-sabor-arte',
    description: 'Cozinha caseira e pizzas artesanais.',
    category: '2',
    phone: '+5511999990002',
    address: 'Rua das Flores, 30 — Centro',
  },
  {
    _id: '3',
    name: 'Oficina do Zé',
    slug: 'oficina-do-ze',
    description: 'Mecânica em geral e troca de óleo.',
    category: '3',
    phone: '+5511999990003',
    address: 'Av. das Oficinas, 210',
  },
  {
    _id: '4',
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    description: 'Cortes clássicos e modernos.',
    category: '5',
    phone: '+5511999990004',
    address: 'Rua XV de Novembro, 88',
  },
  {
    _id: '5',
    name: 'Drogaria Popular',
    slug: 'drogaria-popular',
    description: 'Farmácia de plantão 24h.',
    category: '4',
    phone: '+5511999990005',
    address: 'Av. Brasil, 300 — Centro',
    openingHours: ['Aberto até 23h'],
  },
];

export const MOCK_COUPONS: DisplayCoupon[] = [
  {
    _id: '1',
    title: '20% OFF em Pizzas',
    code: 'PIZZA20',
    discount: '20%',
    company: 'Restaurante Sabor & Arte',
    color: '#5C4033',
  },
  {
    _id: '2',
    title: 'Troca de óleo grátis',
    code: 'OLEOGRATIS',
    company: 'Oficina do Zé',
    color: '#2F4858',
  },
  {
    _id: '3',
    title: '30% OFF no corte',
    code: 'CORTE30',
    discount: '30%',
    company: 'Barbearia Central',
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
