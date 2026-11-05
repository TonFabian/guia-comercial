import { describe, expect, it } from 'vitest';

import type {
  AutonomousProfessional,
  Banner,
  Company,
  Coupon,
  Job,
  Paginated,
  PublicUtility,
  TourEvent,
  TouristSpot,
} from '../../../shared/domain.js';

import { scrubCompany, scrubCoupon, scrubGuestResponse } from './guest.js';

const empresa: Company = {
  _id: 'emp_1',
  name: 'Padaria Pão Quente',
  slug: 'padaria-pao-quente',
  description: 'Pães, bolos e café da manhã',
  category: 'cat_1',
  phone: '+5584999999999',
  whatsapp: '+5584999999999',
  address: 'Rua das Flores, 100',
  city: 'Natal',
  logo: 'https://cdn.example.com/logo.png',
  cover: 'https://cdn.example.com/cover.png',
  isFeatured: true,
  rating: 4.8,
  openingHours: ['06:00-18:00'],
  services: ['entrega'],
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
};

const cupom: Coupon = {
  _id: 'cup_1',
  title: 'Café da manhã com 20% off',
  company: empresa,
  code: 'PAO20',
  discount: '20%',
  description: 'Válido até o fim do mês',
  expiresAt: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-10-01T10:00:00.000Z',
};

const vaga: Job = {
  _id: 'job_1',
  title: 'Atendente de balcão',
  company: empresa,
  description: 'Turno da manhã, 6h por dia',
  location: 'Natal',
  type: 'CLT',
  createdAt: '2026-10-01T10:00:00.000Z',
};

const banner: Banner = {
  _id: 'ban_1',
  title: 'Semana do pão',
  subtitle: 'Ofertas em toda a cidade',
  image: 'https://cdn.example.com/banner.png',
  order: 1,
  active: true,
};

const autonomo: AutonomousProfessional = {
  _id: 'aut_1',
  name: 'Dona Eloá',
  slug: 'dona-eloa',
  specialty: 'Encanadora',
  description: 'Atende toda a cidade',
  phone: '+5584998887777',
  whatsapp: '+5584998887777',
  city: 'natal',
  rating: 5.0,
  createdAt: '2026-10-01T10:00:00.000Z',
};

const utilidade: PublicUtility = {
  _id: 'util_1',
  name: 'Polícia Militar',
  description: 'Número de emergência',
  category: 'emergency',
  phone: '+5584999991900',
  icon: 'shield',
  city: null,
  order: 1,
  active: true,
};

// Turismo: o endereço do passeio é público (o turista precisa saber onde ir) —
// só os contatos comerciais são sensíveis para o convidado (spec D14).
const ponto: TouristSpot = {
  _id: 'ponto_1',
  name: 'Cachoeira do Retiro',
  slug: 'cachoeira-do-retiro',
  description: 'Banho de rio em propriedade particular',
  category: 'waterfall',
  photos: ['https://cdn.example.com/cachoeira.png'],
  address: 'Estrada da Cachoeira, s/n',
  city: 'natal',
  latitude: -5.2,
  longitude: -35.5,
  openingHours: ['08:00-17:00'],
  entryFee: 'paid',
  entryPrice: 'R$ 10,00',
  phone: '+5584999999999',
  whatsapp: '+5584999999999',
  website: 'https://cachoeira.example.com',
  instagram: '@cachoeiradoretiro',
  featured: true,
  active: true,
  order: 2,
  relatedCompany: empresa,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
};

const evento: TourEvent = {
  _id: 'evento_1',
  name: 'Festival do Café',
  slug: 'festival-do-cafe',
  description: 'Três dias de gastronomia e música',
  category: 'festival',
  startDate: '2026-11-05',
  endDate: '2026-11-07',
  startTime: '18:00',
  endTime: '22:00',
  location: 'Recinto de exposições',
  address: 'Av. Beira Mar, 1',
  organizer: 'Associação dos cafeicultores',
  organizerCompany: empresa,
  ticket: 'paid',
  ticketPrice: 'R$ 25,00',
  ticketUrl: 'https://ingressos.example.com/festival',
  photos: ['https://cdn.example.com/festival.png'],
  phone: '+5584999999999',
  whatsapp: '+5584999999999',
  website: 'https://festival.example.com',
  instagram: '@festivaldocafe',
  active: true,
  featured: true,
  createdAt: '2026-10-01T10:00:00.000Z',
};

describe('scrubCompany', () => {
  it('zera phone/whatsapp/address mantendo o resto', () => {
    expect(scrubCompany(empresa)).toEqual({
      ...empresa,
      phone: null,
      whatsapp: null,
      address: null,
    });
  });
});

describe('scrubCoupon', () => {
  it('zera code mantendo o resto', () => {
    expect(scrubCoupon(cupom)).toEqual({
      ...cupom,
      code: null,
    });
  });
});

describe('scrubGuestResponse', () => {
  it('redige os itens de uma resposta paginada mantendo os metadados', () => {
    const pagina: Paginated<Company> = {
      items: [
        empresa,
        { ...empresa, _id: 'emp_2', phone: undefined, whatsapp: undefined },
      ],
      total: 42,
      page: 2,
      pageSize: 20,
    };

    const resposta = scrubGuestResponse(pagina, true);

    expect(resposta.items[0].phone).toBeNull();
    expect(resposta.items[0].whatsapp).toBeNull();
    expect(resposta.items[0].address).toBeNull();
    expect(resposta.items[0].name).toBe('Padaria Pão Quente');
    expect(resposta.items[1].phone).toBeNull();
    expect(resposta.total).toBe(42);
    expect(resposta.page).toBe(2);
    expect(resposta.pageSize).toBe(20);
  });

  it('redige um recurso avulso (não paginado)', () => {
    const resposta = scrubGuestResponse(empresa, true);

    expect(resposta).not.toBe(empresa);
    expect(resposta.phone).toBeNull();
    expect(resposta.whatsapp).toBeNull();
    expect(resposta.address).toBeNull();
    expect(resposta.name).toBe(empresa.name);
    expect(empresa.phone).toBe('+5584999999999');
  });

  it('devolve intacto um payload sem dados redigíveis', () => {
    expect(scrubGuestResponse(banner, true)).toBe(banner);
  });

  it('redige a empresa populada dentro do cupom', () => {
    const resposta = scrubGuestResponse(cupom, true);

    expect(resposta.code).toBeNull();
    expect(resposta.title).toBe(cupom.title);

    const empresaDoCupom = resposta.company;
    if (typeof empresaDoCupom !== 'object') {
      throw new Error('esperava empresa populada no cupom');
    }

    expect(empresaDoCupom.phone).toBeNull();
    expect(empresaDoCupom.whatsapp).toBeNull();
    expect(empresaDoCupom.address).toBeNull();
    expect(empresaDoCupom.name).toBe(empresa.name);
    expect(empresa.phone).toBe('+5584999999999');
  });

  it('redige a empresa populada dentro da vaga', () => {
    const resposta = scrubGuestResponse(vaga, true);

    expect(resposta.title).toBe(vaga.title);

    const empresaDaVaga = resposta.company;
    if (typeof empresaDaVaga !== 'object') {
      throw new Error('esperava empresa populada na vaga');
    }

    expect(empresaDaVaga.phone).toBeNull();
    expect(empresaDaVaga.whatsapp).toBeNull();
    expect(empresaDaVaga.address).toBeNull();
    expect(empresaDaVaga.name).toBe(empresa.name);
  });

  it('redige a empresa organizadora dentro do evento (vazamento de contato)', () => {
    const resposta = scrubGuestResponse(evento, true);

    const empresaOrganizadora = resposta.organizerCompany;
    if (typeof empresaOrganizadora !== 'object') {
      throw new Error('esperava empresa populada no evento');
    }

    expect(empresaOrganizadora.phone).toBeNull();
    expect(empresaOrganizadora.whatsapp).toBeNull();
    expect(empresaOrganizadora.address).toBeNull();
    expect(empresaOrganizadora.name).toBe(empresa.name);
    expect(empresa.phone).toBe('+5584999999999');
  });

  it('redige a empresa populada dentro do ponto turístico (vazamento de contato)', () => {
    const resposta = scrubGuestResponse(ponto, true);

    const empresaRelacionada = resposta.relatedCompany;
    if (typeof empresaRelacionada !== 'object') {
      throw new Error('esperava empresa populada no ponto turístico');
    }

    expect(empresaRelacionada.phone).toBeNull();
    expect(empresaRelacionada.whatsapp).toBeNull();
    expect(empresaRelacionada.address).toBeNull();
    expect(empresaRelacionada.name).toBe(empresa.name);
    expect(empresa.phone).toBe('+5584999999999');
  });

  it('redige só os contatos do ponto: o endereço público do passeio fica', () => {
    // Spec D14: no turismo o endereço é informação pública (onde fica o
    // atrativo) — diferente do endereço comercial da empresa, que é redigido.
    const resposta = scrubGuestResponse(ponto, true);

    expect(resposta.phone).toBeNull();
    expect(resposta.whatsapp).toBeNull();
    expect(resposta.address).toBe('Estrada da Cachoeira, s/n');
    expect(resposta.website).toBe(ponto.website);
    expect(resposta.instagram).toBe(ponto.instagram);
    expect(resposta.entryPrice).toBe('R$ 10,00');
    expect(resposta.slug).toBe(ponto.slug);
    expect(ponto.phone).toBe('+5584999999999');
  });

  it('redige só os contatos do evento: o endereço público fica', () => {
    const resposta = scrubGuestResponse(evento, true);

    expect(resposta.phone).toBeNull();
    expect(resposta.whatsapp).toBeNull();
    expect(resposta.address).toBe('Av. Beira Mar, 1');
    expect(resposta.ticketUrl).toBe(evento.ticketUrl);
    expect(resposta.ticketPrice).toBe('R$ 25,00');
    expect(resposta.location).toBe(evento.location);
    expect(resposta.organizer).toBe(evento.organizer);
    expect(evento.phone).toBe('+5584999999999');
  });

  it('redige o autônomo sem tocar no restante', () => {
    const resposta = scrubGuestResponse(autonomo, true);

    expect(resposta.phone).toBeNull();
    expect(resposta.whatsapp).toBeNull();
    expect(resposta.specialty).toBe(autonomo.specialty);
  });

  it('mantém a utilidade pública intacta (não é Company)', () => {
    // Sem slug (diferente de Company) e sem dado comercial: passa por
    // referência, sem cópia nem redação de telefone de emergência.
    expect(scrubGuestResponse(utilidade, true)).toBe(utilidade);
    expect(utilidade.phone).toBe('+5584999991900');
  });

  it('redige os itens paginados de pontos turísticos mantendo os metadados', () => {
    const pagina: Paginated<TouristSpot> = {
      items: [ponto, { ...ponto, _id: 'ponto_2', slug: 'praca-matriz', active: false }],
      total: 7,
      page: 3,
      pageSize: 10,
    };

    const resposta = scrubGuestResponse(pagina, true);

    expect(resposta.items[0].phone).toBeNull();
    expect(resposta.items[0].whatsapp).toBeNull();
    expect(resposta.items[0].address).toBe('Estrada da Cachoeira, s/n');
    const empresaRelacionada = resposta.items[0].relatedCompany;
    if (typeof empresaRelacionada !== 'object') {
      throw new Error('esperava empresa populada no ponto turístico');
    }
    expect(empresaRelacionada.phone).toBeNull();
    expect(resposta.total).toBe(7);
    expect(resposta.page).toBe(3);
    expect(resposta.pageSize).toBe(10);
  });

  it('devolve o mesmo payload quando o usuário não é convidado', () => {
    expect(scrubGuestResponse(empresa, false)).toBe(empresa);
    expect(scrubGuestResponse(ponto, false)).toBe(ponto);
    expect(scrubGuestResponse(evento, false)).toBe(evento);

    const pagina: Paginated<Coupon> = {
      items: [cupom],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    expect(scrubGuestResponse(pagina, false)).toBe(pagina);
  });
});
