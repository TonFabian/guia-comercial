import { describe, expect, it } from 'vitest';

import { companyPlan, hasFeature } from './company-plan';
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
});