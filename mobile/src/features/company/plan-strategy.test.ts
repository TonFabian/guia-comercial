import { describe, expect, it } from 'vitest';

import { getPlanStrategy } from './plan-strategy';
import type { Feature } from './plan-strategy';

const features: Feature[] = ['catalog', 'analytics', 'priority', 'coupons'];

describe('plan-strategy', () => {
  it('free has no features', () => {
    const s = getPlanStrategy('free');
    expect(s.label).toBe('Gratuito');
    for (const f of features) expect(s.hasFeature(f)).toBe(false);
  });

  it('basic has catalog and priority', () => {
    const s = getPlanStrategy('basic');
    expect(s.label).toBe('Básico');
    expect(s.hasFeature('catalog')).toBe(true);
    expect(s.hasFeature('priority')).toBe(true);
    expect(s.hasFeature('analytics')).toBe(false);
    expect(s.hasFeature('coupons')).toBe(false);
  });

  it('premium has all features', () => {
    const s = getPlanStrategy('premium');
    expect(s.label).toBe('Premium');
    for (const f of features) expect(s.hasFeature(f)).toBe(true);
  });

  it('normalizes unknown/null to free', () => {
    expect(getPlanStrategy(null).label).toBe('Gratuito');
    expect(getPlanStrategy('gold').hasFeature('catalog')).toBe(false);
  });
});