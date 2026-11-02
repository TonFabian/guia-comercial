import { describe, expect, it } from 'vitest';

import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formata o valor em reais', () => {
    expect(formatPrice(45)).toBe('R$ 45,00');
  });

  it('formata valores fracionários', () => {
    expect(formatPrice(59.9)).toBe('R$ 59,90');
  });

  it('formata zero', () => {
    expect(formatPrice(0)).toBe('R$ 0,00');
  });
});
