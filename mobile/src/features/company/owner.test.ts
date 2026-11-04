import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';

import { filterOwnedCompanies, resolveContactNumbers } from './owner';

const EMPRESA_BASE: Company = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Barbearia Central',
  slug: 'barbearia-central',
  description: 'Cortes e barba.',
  category: 'beleza',
  ownerClerkId: 'user_1',
};

describe('filterOwnedCompanies', () => {
  it('retorna vazio quando não há clerkId', () => {
    expect(filterOwnedCompanies([EMPRESA_BASE])).toEqual([]);
  });

  it('filtra apenas empresas do dono', () => {
    const outra: Company = { ...EMPRESA_BASE, _id: '2', ownerClerkId: 'user_2' };
    expect(filterOwnedCompanies([EMPRESA_BASE, outra], 'user_1')).toEqual([EMPRESA_BASE]);
  });
});

describe('resolveContactNumbers', () => {
  it('usa o mesmo número para WhatsApp quando marcado', () => {
    expect(resolveContactNumbers('11999990000', '11888880000', true)).toEqual({
      phone: '11999990000',
      whatsapp: '11999990000',
    });
  });

  it('mantém números distintos quando não marcado', () => {
    expect(resolveContactNumbers('11999990000', '11888880000', false)).toEqual({
      phone: '11999990000',
      whatsapp: '11888880000',
    });
  });

  it('ignora valores em branco', () => {
    expect(resolveContactNumbers('   ', '11888880000', false)).toEqual({
      phone: undefined,
      whatsapp: '11888880000',
    });
  });
});