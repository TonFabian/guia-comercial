import { describe, it, expect } from 'vitest';
import { fluidWidthFactor } from './fluid-width';

describe('fluidWidthFactor', () => {
  it('clampa em 0.9 para telas pequenas', () => {
    expect(fluidWidthFactor(375, 320)).toBe(0.9);
    expect(fluidWidthFactor(375, 200)).toBe(0.9);
  });
  it('retorna 1 em 375dp (referência)', () => {
    expect(fluidWidthFactor(375, 375)).toBe(1);
  });
  it('clampa em 1.2 para telas grandes', () => {
    expect(fluidWidthFactor(375, 500)).toBe(1.2);
    expect(fluidWidthFactor(375, 1000)).toBe(1.2);
  });
  it('escala linearmente no intervalo', () => {
    expect(fluidWidthFactor(375, 375 * 1.1)).toBeCloseTo(1.1, 5);
  });
});
