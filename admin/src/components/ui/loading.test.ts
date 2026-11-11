import { describe, expect, it } from 'vitest';

import { dotDelayMs, skeletonClass, tableSkeletonRowCount } from './loading';

describe('loading helpers', () => {
  it('skeleton usa shimmer (animate-pulse) e token de superfície do tema', () => {
    expect(skeletonClass()).toContain('animate-pulse');
    expect(skeletonClass()).toContain('bg-surface-hover');
  });

  it('tabela skeleton tem 5 linhas por padrão', () => {
    expect(tableSkeletonRowCount(undefined)).toBe(5);
  });

  it('tabela skeleton limita linhas entre 1 e 10', () => {
    expect(tableSkeletonRowCount(0)).toBe(1);
    expect(tableSkeletonRowCount(-3)).toBe(1);
    expect(tableSkeletonRowCount(50)).toBe(10);
  });

  it('dots do loader têm atraso escalonado entre eles', () => {
    expect(dotDelayMs(0)).toBe(0);
    expect(dotDelayMs(1)).toBeGreaterThan(dotDelayMs(0));
    expect(dotDelayMs(2)).toBeGreaterThan(dotDelayMs(1));
  });
});
