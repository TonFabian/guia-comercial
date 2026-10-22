import { describe, expect, it } from 'vitest';

import { createCompanySchema } from './dto.js';

const EMPRESA_BASE = {
  name: 'Barbearia Central',
  slug: 'barbearia-central',
  description: 'Cortes, barba e grooming com horário agendado.',
  category: '507f1f77bcf86cd799439011',
};

describe('createCompanySchema', () => {
  it('aceita o perfil comercial completo (verificado, avaliações, site, redes e produtos)', () => {
    const parsed = createCompanySchema.parse({
      ...EMPRESA_BASE,
      isVerified: true,
      ratingCount: 128,
      website: 'https://barbeariacentral.com.br',
      instagram: '@barbeariacentral',
      facebook: 'https://facebook.com/barbeariacentral',
      products: [
        { name: 'Corte social', description: 'Corte + barba', price: 45 },
        { name: 'Pigmentação', price: 120, image: 'https://cdn.exemplo.com/pigmentacao.jpg' },
      ],
    });

    expect(parsed.isVerified).toBe(true);
    expect(parsed.ratingCount).toBe(128);
    expect(parsed.website).toBe('https://barbeariacentral.com.br');
    expect(parsed.instagram).toBe('@barbeariacentral');
    expect(parsed.facebook).toBe('https://facebook.com/barbeariacentral');
    expect(parsed.products).toHaveLength(2);
    expect(parsed.products?.[0]?.price).toBe(45);
  });

  it('rejeita contagem de avaliações negativa', () => {
    const result = createCompanySchema.safeParse({ ...EMPRESA_BASE, ratingCount: -1 });

    expect(result.success).toBe(false);
  });

  it('rejeita produto sem nome', () => {
    const result = createCompanySchema.safeParse({
      ...EMPRESA_BASE,
      products: [{ description: 'Produto sem nome', price: 10 }],
    });

    expect(result.success).toBe(false);
  });

  it('rejeita preço de produto negativo', () => {
    const result = createCompanySchema.safeParse({
      ...EMPRESA_BASE,
      products: [{ name: 'Corte social', price: -5 }],
    });

    expect(result.success).toBe(false);
  });

  it('mantém a empresa válida sem os campos opcionais', () => {
    const parsed = createCompanySchema.parse(EMPRESA_BASE);

    expect(parsed.isVerified).toBeUndefined();
    expect(parsed.products).toBeUndefined();
  });
});
