import { describe, expect, it } from 'vitest';

import {
  convertOpeningHoursToSchedule,
  isCompanyOpen,
  parseOpeningHoursString,
} from './opening-hours.js';

describe('parseOpeningHoursString', () => {
  it('faz parse de intervalo de dias com colon', () => {
    const itens = parseOpeningHoursString('Seg a Sex: 08h às 18h');
    expect(itens).not.toBeNull();
    expect(itens).toHaveLength(5);
    expect(itens![0]).toEqual({ day: 1, opens: 480, closes: 1080 });
    expect(itens!.map((i) => i.day)).toEqual([1, 2, 3, 4, 5]);
  });

  it('faz parse de "Todos os dias" com minutos', () => {
    const itens = parseOpeningHoursString('Todos os dias: 00h às 23h59');
    expect(itens).not.toBeNull();
    expect(itens).toHaveLength(7);
    expect(itens![0]).toEqual({ day: 0, opens: 0, closes: 23 * 60 + 59 });
  });

  it('faz parse sem colon e com travessão ("Seg–Sex 08h–18h")', () => {
    const itens = parseOpeningHoursString('Seg–Sex 08h–18h');
    expect(itens).not.toBeNull();
    expect(itens!.map((i) => i.day)).toEqual([1, 2, 3, 4, 5]);
    expect(itens![0]).toEqual({ day: 1, opens: 480, closes: 1080 });
  });

  it('faz parse de dia único com acento ("Sáb: 08h às 12h")', () => {
    const itens = parseOpeningHoursString('Sáb: 08h às 12h');
    expect(itens).toEqual([{ day: 6, opens: 480, closes: 720 }]);
  });

  it('faz parse de dia único com hífen ("Dom: 09h às 13h")', () => {
    const itens = parseOpeningHoursString('Dom: 09h às 13h');
    expect(itens).toEqual([{ day: 0, opens: 540, closes: 780 }]);
  });

  it('retorna null quando não há dois horários', () => {
    expect(parseOpeningHoursString('Seg: 08h')).toBeNull();
  });

  it('retorna null quando não há dia reconhecível', () => {
    expect(parseOpeningHoursString('08h às 18h')).toBeNull();
  });

  it('retorna null quando string vazia ou lixo', () => {
    expect(parseOpeningHoursString('')).toBeNull();
    expect(parseOpeningHoursString('Fechado')).toBeNull();
  });

  it('rejeita horas fora de 0–23', () => {
    expect(parseOpeningHoursString('Seg: 08h às 25h')).toBeNull();
  });
});

describe('convertOpeningHoursToSchedule', () => {
  it('expande várias linhas e ignora inválidas', () => {
    const schedule = convertOpeningHoursToSchedule([
      'Seg a Sex: 08h às 18h',
      'Dom: 09h0 às 13h',
      'linha inválida',
    ]);
    expect(schedule.map((i) => i.day)).toEqual([1, 2, 3, 4, 5, 0]);
    expect(schedule.at(-1)).toEqual({ day: 0, opens: 540, closes: 13 * 60 });
  });

  it('retorna [], sem lançar, para entradas vazias', () => {
    expect(convertOpeningHoursToSchedule([])).toEqual([]);
    expect(convertOpeningHoursToSchedule([' ??? '])).toEqual([]);
  });
});

describe('isCompanyOpen', () => {
  const segSex = { day: 1, opens: 480, closes: 1080 };

  it('abre dentro da faixa do dia', () => {
    // segunda, 09:00
    expect(isCompanyOpen([segSex], new Date(2026, 10, 2, 9, 0))).toBe(true);
  });

  it('fecha exatamente no instante de fechamento', () => {
    // segunda, 18:00
    expect(isCompanyOpen([segSex], new Date(2026, 10, 2, 18, 0))).toBe(false);
  });

  it('fecha em dia fora da faixa', () => {
    // domingo
    expect(isCompanyOpen([segSex], new Date(2026, 10, 1, 9, 0))).toBe(false);
  });

  it('atravessa meia-noite: aberto antes da meia-noite no próprio dia', () => {
    const noturno = { day: 5, opens: 1080, closes: 120 };
    // sexta, 19:00
    expect(isCompanyOpen([noturno], new Date(2026, 10, 6, 19, 0))).toBe(true);
  });

  it('atravessa meia-noite: aberto após a meia-noite no dia seguinte', () => {
    const noturno = { day: 5, opens: 1080, closes: 120 };
    // sábado (dia seguinte à sexta), 01:00
    expect(isCompanyOpen([noturno], new Date(2026, 10, 7, 1, 0))).toBe(true);
  });

  it('atravessa meia-noite: fechado após o horário de fechamento', () => {
    const noturno = { day: 5, opens: 1080, closes: 120 };
    // sábado, 03:00
    expect(isCompanyOpen([noturno], new Date(2026, 10, 7, 3, 0))).toBe(false);
  });

  it('retorna false para schedule vazio', () => {
    expect(isCompanyOpen([], new Date(2026, 10, 2, 9, 0))).toBe(false);
  });
});
