import { describe, expect, it } from 'vitest';

import { isEventVisibleOn, todayInFortaleza } from './event-date.js';

describe('isEventVisibleOn', () => {
  it('mantém o evento visível no próprio dia de encerramento', () => {
    expect(isEventVisibleOn('2026-11-05', '2026-11-05')).toBe(true);
  });

  it('esconde o evento vencido (endDate antes da data de referência)', () => {
    expect(isEventVisibleOn('2026-11-04', '2026-11-05')).toBe(false);
  });

  it('mantém visível o evento com data futura', () => {
    expect(isEventVisibleOn('2026-12-10', '2026-11-05')).toBe(true);
  });
});

describe('todayInFortaleza', () => {
  it('converte um instante UTC no dia de Fortaleza em YYYY-MM-DD', () => {
    // 12:00Z = 09:00 de Fortaleza no mesmo dia.
    expect(todayInFortaleza(new Date('2026-11-05T12:00:00Z'))).toBe('2026-11-05');
  });

  it('recua um dia quando o instante ainda é a noite anterior em Fortaleza', () => {
    // 02:00Z = 23:00 de 04/11 em Fortaleza (UTC-3).
    expect(todayInFortaleza(new Date('2026-11-05T02:00:00Z'))).toBe('2026-11-04');
  });

  it('recua um dia no fim do mês', () => {
    // 01:00Z de 01/12 = 22:00 de 30/11 em Fortaleza.
    expect(todayInFortaleza(new Date('2026-12-01T01:00:00Z'))).toBe('2026-11-30');
  });
});
