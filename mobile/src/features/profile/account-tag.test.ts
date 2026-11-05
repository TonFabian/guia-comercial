import { describe, expect, it } from 'vitest';

import { resolveAccountTag } from './account-tag';

describe('resolveAccountTag', () => {
  it('retorna Cidadão quando o usuário não possui empresa', () => {
    expect(resolveAccountTag(false)).toBe('Cidadão');
  });

  it('retorna Empresa Parceira quando o usuário possui empresa', () => {
    expect(resolveAccountTag(true)).toBe('Empresa Parceira');
  });

  it('não retorna tag quando a posse ainda é desconhecida', () => {
    expect(resolveAccountTag(null)).toBeNull();
  });
});
