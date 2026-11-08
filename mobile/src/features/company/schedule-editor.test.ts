import { describe, expect, it } from 'vitest';

import { parseOpeningHours } from './opening-hours';

import {
  dayStatesToSchedule,
  formatTimeInput,
  openingHoursToDayStates,
  parseTimeInput,
  scheduleToDayStates,
} from './schedule-editor';

const DIAS_VAZIOS = () =>
  Array.from({ length: 7 }, (_, day) => ({ day, isOpen: false, opens: '', closes: '' }));

describe('parseTimeInput', () => {
  it('lê "HH:mm" como minutos desde a meia-noite', () => {
    expect(parseTimeInput('08:30')).toBe(510);
    expect(parseTimeInput('0:00')).toBe(0);
    expect(parseTimeInput('23:59')).toBe(1439);
  });

  it('lê hora inteira sem minutos', () => {
    expect(parseTimeInput('08')).toBe(480);
    expect(parseTimeInput('8h')).toBe(480);
  });

  it('rejeita formatos inválidos e valores acima de 23:59', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('abc')).toBeNull();
    expect(parseTimeInput('24:00')).toBeNull();
    expect(parseTimeInput('10:75')).toBeNull();
  });
});

describe('formatTimeInput', () => {
  it('formata minutos como "HH:mm"', () => {
    expect(formatTimeInput(510)).toBe('08:30');
    expect(formatTimeInput(0)).toBe('00:00');
    expect(formatTimeInput(1439)).toBe('23:59');
  });
});

describe('scheduleToDayStates', () => {
  it('preenche uma edição por dia com os minutos do schedule', () => {
    const estados = scheduleToDayStates([
      { day: 1, opens: 480, closes: 1080 },
      { day: 6, opens: 480, closes: 720 },
    ]);

    expect(estados).toHaveLength(7);
    expect(estados[0]?.isOpen).toBe(false);
    expect(estados[1]).toEqual({ day: 1, isOpen: true, opens: '08:00', closes: '18:00' });
    expect(estados[6]).toEqual({ day: 6, isOpen: true, opens: '08:00', closes: '12:00' });
  });
});

describe('openingHoursToDayStates', () => {
  it('expande os dias interpretados do texto livre para a grade', () => {
    const estados = openingHoursToDayStates(parseOpeningHours(['Seg a Sex: 08h às 18h']));

    expect(estados[1]).toEqual({ day: 1, isOpen: true, opens: '08:00', closes: '18:00' });
    expect(estados[5]).toEqual({ day: 5, isOpen: true, opens: '08:00', closes: '18:00' });
    expect(estados[6]?.isOpen).toBe(false);
  });

  it('ignora linhas sem dia e faixa completos', () => {
    const estados = openingHoursToDayStates(parseOpeningHours(['Seg a Sex 08h']));

    expect(estados.every((estado) => !estado.isOpen)).toBe(true);
  });
});

describe('dayStatesToSchedule', () => {
  it('emite só os dias marcados como abertos, em minutos', () => {
    const estados = DIAS_VAZIOS();
    estados[0] = { day: 0, isOpen: true, opens: '11:00', closes: '23:00' };
    estados[1] = { day: 1, isOpen: true, opens: '08:00', closes: '18:00' };

    expect(dayStatesToSchedule(estados)).toEqual([
      { day: 0, opens: 660, closes: 1380 },
      { day: 1, opens: 480, closes: 1080 },
    ]);
  });

  it('emite faixa que atravessa a meia-noite e descarta dias sem faixa válida', () => {
    const estados = DIAS_VAZIOS();
    estados[2] = { day: 2, isOpen: true, opens: '19:00', closes: '02:00' };
    estados[3] = { day: 3, isOpen: true, opens: '25:00', closes: '18:00' };
    estados[4] = { day: 4, isOpen: true, opens: '', closes: '18:00' };
    estados[5] = { day: 5, isOpen: false, opens: '08:00', closes: '18:00' };

    expect(dayStatesToSchedule(estados)).toEqual([
      { day: 2, opens: 1140, closes: 120 },
    ]);
  });
});
