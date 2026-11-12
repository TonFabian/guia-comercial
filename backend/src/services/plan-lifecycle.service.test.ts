import { describe, expect, it } from 'vitest';

import { computeAction } from './plan-lifecycle.service.js';

describe('computeAction — matriz de vigência (spec §5.1)', () => {
  const EXPIRES = '2026-12-01';

  it('free nunca tem ação', () => {
    expect(computeAction('free', EXPIRES, '2026-11-24')).toBeNull();
  });

  it('sem planExpiresAt nunca tem ação (sem vencimento)', () => {
    expect(computeAction('premium', undefined, '2026-12-01')).toBeNull();
  });

  it('D-8 (fora da janela) → null', () => {
    expect(computeAction('premium', EXPIRES, '2026-11-23')).toBeNull();
  });

  it('D-7 → expiring-7d', () => {
    expect(computeAction('premium', EXPIRES, '2026-11-24')).toBe('expiring-7d');
  });

  it('D-2 → null', () => {
    expect(computeAction('premium', EXPIRES, '2026-11-29')).toBeNull();
  });

  it('D-1 → expiring-1d', () => {
    expect(computeAction('premium', EXPIRES, '2026-11-30')).toBe('expiring-1d');
  });

  it('D-0 (dia do vencimento) → expired (plano vale até a véspera)', () => {
    expect(computeAction('premium', EXPIRES, '2026-12-01')).toBe('expired');
  });

  it('dia atrasado (cron caiu) → expired', () => {
    expect(computeAction('basic', EXPIRES, '2026-12-05')).toBe('expired');
  });
});
