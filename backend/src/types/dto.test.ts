import { describe, expect, it } from 'vitest';

import { createCompanySchema, updateCompanySchema, createPublicUtilitySchema, updateUserSchema } from './dto.js';

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

  it('aceita plan valido (free/basic/premium)', () => {
    for (const plan of ['free', 'basic', 'premium'] as const) {
      const result = createCompanySchema.safeParse({ ...EMPRESA_BASE, plan });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.plan).toBe(plan);
    }
  });

  it('rejeita plan invalido', () => {
    const result = createCompanySchema.safeParse({ ...EMPRESA_BASE, plan: 'gold' });
    expect(result.success).toBe(false);
  });

  it('default de plan eh free quando ausente', () => {
    const parsed = createCompanySchema.parse(EMPRESA_BASE);
    expect(parsed.plan).toBe('free');
  });
});

describe('updateCompanySchema', () => {
  it('permite atualizacao parcial de campos publicos', () => {
    const result = updateCompanySchema.safeParse({ name: 'Novo nome' });
    expect(result.success).toBe(true);
  });

  it('descarta plan no update publico (sem bypass)', () => {
    // plan nao faz parte do contrato publico: o schema omite o campo e o zod
    // (sem strict) descarta o que vier a mais — a edicao segue sem o plano.
    const result = updateCompanySchema.safeParse({ plan: 'basic', name: 'Novo nome' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('plan' in result.data).toBe(false);
      expect(result.data.name).toBe('Novo nome');
    }
  });
});

describe('updateUserSchema', () => {
  it('aceita bairro de residência e remove espaços nas pontas', () => {
    const parsed = updateUserSchema.parse({ neighborhood: '  Centro  ' });

    expect(parsed.neighborhood).toBe('Centro');
  });

  it('aceita bairro vazio para limpar o campo', () => {
    const parsed = updateUserSchema.parse({ neighborhood: '' });

    expect(parsed.neighborhood).toBe('');
  });

  it('rejeita bairro com mais de 120 caracteres', () => {
    const result = updateUserSchema.safeParse({ neighborhood: 'a'.repeat(121) });

    expect(result.success).toBe(false);
  });

  it('aceita as preferências de utilidade pública e vagas', () => {
    const parsed = updateUserSchema.parse({
      preferences: { publicUtilityAlerts: true, jobPostingAlerts: false },
    });

    expect(parsed.preferences?.publicUtilityAlerts).toBe(true);
    expect(parsed.preferences?.jobPostingAlerts).toBe(false);
  });

  it('rejeita preferência que não seja booleana', () => {
    const result = updateUserSchema.safeParse({
      preferences: { jobPostingAlerts: 'sim' },
    });

    expect(result.success).toBe(false);
  });
});

describe('createPublicUtilitySchema', () => {
  const SERVICO_BASE = {
    name: 'Polícia Militar',
    description: 'Emergência em Castelo do Piauí',
    category: 'emergency',
  };

  it('aceita o serviço público completo', () => {
    const parsed = createPublicUtilitySchema.parse({
      ...SERVICO_BASE,
      phone: '190',
      details: ['Disque emergência'],
      icon: 'shield-alert',
      city: 'castelo-do-piaui',
      order: 1,
      active: true,
    });

    expect(parsed.category).toBe('emergency');
    expect(parsed.phone).toBe('190');
    expect(parsed.details).toEqual(['Disque emergência']);
    expect(parsed.order).toBe(1);
  });

  it('rejeita categoria fora da lista', () => {
    const result = createPublicUtilitySchema.safeParse({
      ...SERVICO_BASE,
      category: 'outra-categoria',
    });

    expect(result.success).toBe(false);
  });

  it('rejeita serviço sem nome', () => {
    const result = createPublicUtilitySchema.safeParse({
      ...SERVICO_BASE,
      name: '   ',
    });

    expect(result.success).toBe(false);
  });
});


import { updatePlanSchema } from '../types/dto.js';

describe('updatePlanSchema — datas de vigencia', () => {
  it('aceita datas no formato YYYY-MM-DD', () => {
    const r = updatePlanSchema.safeParse({ plan: 'premium', planStartedAt: '2026-11-01', planExpiresAt: '2026-12-31' });
    expect(r.success).toBe(true);
  });

  it('rejeita formato invalido', () => {
    const r = updatePlanSchema.safeParse({ plan: 'premium', planExpiresAt: '31/12/2026' });
    expect(r.success).toBe(false);
  });

  it('rejeita data de calendario inexistente (2026-02-30)', () => {
    const r = updatePlanSchema.safeParse({ plan: 'premium', planExpiresAt: '2026-02-30' });
    expect(r.success).toBe(false);
  });

  it('null limpa a data; ausente (undefined) mantem', () => {
    const limpa = updatePlanSchema.safeParse({ plan: 'free', planExpiresAt: null });
    expect(limpa.success).toBe(true);
    if (limpa.success) expect(limpa.data.planExpiresAt).toBeNull();
    const mantem = updatePlanSchema.safeParse({ plan: 'premium' });
    expect(mantem.success).toBe(true);
    if (mantem.success) expect(mantem.data.planExpiresAt).toBeUndefined();
  });

  it('rejeita fim anterior ao inicio quando ambos vem no body', () => {
    const r = updatePlanSchema.safeParse({ plan: 'basic', planStartedAt: '2026-12-01', planExpiresAt: '2026-11-30' });
    expect(r.success).toBe(false);
  });
});
