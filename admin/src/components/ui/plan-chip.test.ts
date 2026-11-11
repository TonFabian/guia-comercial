import { describe, expect, it } from 'vitest';

import { planChipClass, planChipLabel } from './plan-chip';

describe('plan-chip helper', () => {
  it('premium tem label de destaque e texto escuro sobre gradiente', () => {
    expect(planChipLabel('premium')).toBe('★ Premium');
    expect(planChipClass('premium')).toContain('text-[#111827]');
    expect(planChipClass('premium')).toContain('bg-gradient-to-r');
  });

  it('basic tem label Básico e destaque neutro com acento', () => {
    expect(planChipLabel('basic')).toBe('Básico');
    expect(planChipClass('basic')).toContain('text-primary');
    expect(planChipClass('basic')).not.toContain('bg-gradient-to-r');
  });

  it('free tem label Gratuito discreto', () => {
    expect(planChipLabel('free')).toBe('Gratuito');
    expect(planChipClass('free')).toContain('text-text-muted');
  });

  it('três planos têm classes distintas entre si', () => {
    const classes = new Set([planChipClass('premium'), planChipClass('basic'), planChipClass('free')]);
    expect(classes.size).toBe(3);
  });
});
