import { describe, expect, it } from 'vitest';

import type { Company, Coupon, Paginated } from '../../../shared/domain.js';

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

  it('devolve o mesmo payload quando o usuário não é convidado', () => {
    expect(scrubGuestResponse(empresa, false)).toBe(empresa);

    const pagina: Paginated<Coupon> = {
      items: [cupom],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    expect(scrubGuestResponse(pagina, false)).toBe(pagina);
  });
});
