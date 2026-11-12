import { describe, expect, it } from 'vitest';

import { CompanyModel } from './company.model.js';

describe('company.model — vigência do plano', () => {
  it('declara planStartedAt e planExpiresAt como String', () => {
    expect(CompanyModel.schema.path('planStartedAt')?.instance).toBe('String');
    expect(CompanyModel.schema.path('planExpiresAt')?.instance).toBe('String');
  });

  it('tem índice parcial em planExpiresAt restrito a planos pagos com data', () => {
    const indice = CompanyModel.schema.indexes().find(
      ([chaves]) => 'planExpiresAt' in chaves,
    );
    expect(indice).toBeTruthy();
    const opcoes = indice?.[1] as { partialFilterExpression?: Record<string, unknown> };
    expect(opcoes.partialFilterExpression?.plan).toEqual({ $in: ['basic', 'premium'] });
    expect(opcoes.partialFilterExpression?.planExpiresAt).toEqual({ $type: 'string' });
  });
});
