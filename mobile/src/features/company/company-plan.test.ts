import { describe, expect, it } from 'vitest';

import { companyPlan, hasFeature, sortCompaniesByPlan } from './company-plan';
import type { Company } from '@/types/domain';

const base: Company = { _id: '1', name: 'X', slug: 'x', description: 'd', category: 'c' };

describe('company-plan', () => {
  it('companyPlan retorna free quando plan ausente', () => {
    expect(companyPlan(base)).toBe('free');
  });

  it('companyPlan retorna plan quando presente', () => {
    expect(companyPlan({ ...base, plan: 'premium' })).toBe('premium');
    expect(companyPlan({ ...base, plan: 'basic' })).toBe('basic');
  });

  it('companyPlan retorna free para plan desconhecido', () => {
    expect(companyPlan({ ...base, plan: 'gold' as never })).toBe('free');
  });

  it('hasFeature: premium tem catalogo ilimitado', () => {
    expect(hasFeature('premium', 'unlimitedCatalog')).toBe(true);
    expect(hasFeature('basic', 'unlimitedCatalog')).toBe(false);
    expect(hasFeature('free', 'unlimitedCatalog')).toBe(false);
  });

  it('hasFeature: basic tem galeria', () => {
    expect(hasFeature('basic', 'gallery')).toBe(true);
    expect(hasFeature('free', 'gallery')).toBe(false);
  });

  it('sortCompaniesByPlan ordena premium > basic > free e nao oculta ninguem', () => {
    const livre: Company = { ...base, _id: '2', name: 'B Free', slug: 'b' };
    const premium: Company = { ...base, _id: '3', name: 'A Premium', slug: 'a', plan: 'premium' };
    const basico: Company = { ...base, _id: '4', name: 'C Basic', slug: 'c', plan: 'basic' };

    const ordenadas = sortCompaniesByPlan([livre, premium, basico]);

    expect(ordenadas).toHaveLength(3);
    expect(ordenadas.map((c) => c.plan)).toEqual(['premium', 'basic', undefined]);
  });

  it('sortCompaniesByPlan desempata por nome dentro do mesmo plano', () => {
    const z: Company = { ...base, _id: '2', name: 'Z Free', slug: 'z' };
    const a: Company = { ...base, _id: '3', name: 'A Free', slug: 'a' };

    expect(sortCompaniesByPlan([z, a]).map((c) => c.name)).toEqual(['A Free', 'Z Free']);
  });

  it('sortCompaniesByPlan trata plan ausente/desconhecido como free', () => {
    const desconhecida: Company = { ...base, _id: '2', name: 'Gold', slug: 'g', plan: 'gold' as never };
    const livre: Company = { ...base, _id: '3', name: 'Free', slug: 'f' };

    const ordenadas = sortCompaniesByPlan([desconhecida, livre]);
    expect(ordenadas.map((c) => c._id)).toEqual(['3', '2']);
  });
});