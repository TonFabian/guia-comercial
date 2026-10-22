import { describe, expect, it } from 'vitest';

import {
  formatOpeningRange,
  isOpenNow,
  openingStatusLabel,
  parseOpeningHours,
} from './opening-hours';

describe('parseOpeningHours', () => {
  it('interpreta um intervalo com dias da semana', () => {
    const [horario] = parseOpeningHours(['Seg a Sex: 08h às 18h']);

    expect(horario?.label).toBe('Seg a Sex');
    expect(horario?.days).toEqual([1, 2, 3, 4, 5]);
    expect(horario?.opens).toBe(8 * 60);
    expect(horario?.closes).toBe(18 * 60);
  });

  it('expande "Todos os dias" para a semana inteira', () => {
    const [horario] = parseOpeningHours(['Todos os dias: 11h às 23h']);

    expect(horario?.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(horario?.opens).toBe(11 * 60);
    expect(horario?.closes).toBe(23 * 60);
  });

  it('expande um intervalo que atravessa o fim de semana', () => {
    const [horario] = parseOpeningHours(['Ter a Dom: 09h às 20h']);

    expect(horario?.days).toEqual([2, 3, 4, 5, 6, 0]);
  });

  it('interpreta um dia único', () => {
    const [horario] = parseOpeningHours(['Sáb: 08h às 12h']);

    expect(horario?.label).toBe('Sáb');
    expect(horario?.days).toEqual([6]);
  });

  it('aceita o formato com traço e com dois pontos', () => {
    const [comTraco] = parseOpeningHours(['Seg–Sex 08h–18h']);
    const [comPontos] = parseOpeningHours(['Seg: 08:00 às 18:00']);

    expect(comTraco?.opens).toBe(8 * 60);
    expect(comTraco?.closes).toBe(18 * 60);
    expect(comPontos?.opens).toBe(8 * 60);
    expect(comPontos?.closes).toBe(18 * 60);
  });

  it('não inventa horário quando o texto não traz intervalo', () => {
    const [horario] = parseOpeningHours(['Aberto até 23h']);

    expect(horario?.opens).toBeNull();
    expect(horario?.closes).toBeNull();
  });

  it('mantém o texto original de cada horário', () => {
    const horarios = parseOpeningHours(['Seg a Sex: 08h às 18h']);

    expect(horarios[0]?.raw).toBe('Seg a Sex: 08h às 18h');
  });
});

describe('isOpenNow', () => {
  const horarios = parseOpeningHours(['Seg a Sex: 08h às 18h']);

  it('confirma aberto dentro do intervalo', () => {
    // 2026-10-21 é uma quarta-feira.
    expect(isOpenNow(horarios, new Date(2026, 9, 21, 10, 0))).toBe(true);
  });

  it('confirma fechado depois do fechamento', () => {
    expect(isOpenNow(horarios, new Date(2026, 9, 21, 20, 0))).toBe(false);
  });

  it('confirma fechado antes da abertura', () => {
    expect(isOpenNow(horarios, new Date(2026, 9, 21, 7, 30))).toBe(false);
  });

  it('confirma fechado no dia sem horário cadastrado', () => {
    // Domingo.
    expect(isOpenNow(horarios, new Date(2026, 9, 25, 12, 0))).toBe(false);
  });

  it('trata horário que atravessa a meia-noite como aberto à noite', () => {
    const noturnos = parseOpeningHours(['Seg a Sex: 18h às 02h']);

    expect(isOpenNow(noturnos, new Date(2026, 9, 21, 23, 0))).toBe(true);
    expect(isOpenNow(noturnos, new Date(2026, 9, 21, 1, 0))).toBe(true);
    expect(isOpenNow(noturnos, new Date(2026, 9, 21, 12, 0))).toBe(false);
  });

  it('devolve null quando o horário não pode ser interpretado', () => {
    const semInformacao = parseOpeningHours(['Aberto até 23h']);

    expect(isOpenNow(semInformacao, new Date(2026, 9, 21, 12, 0))).toBeNull();
  });

  it('devolve null quando não há horários cadastrados', () => {
    expect(isOpenNow([], new Date(2026, 9, 21, 12, 0))).toBeNull();
  });
});

describe('formatOpeningRange', () => {
  it('formata a faixa de horário', () => {
    const [horario] = parseOpeningHours(['Seg a Sex: 08h às 18h']);

    expect(formatOpeningRange(horario!)).toBe('08h às 18h');
  });

  it('mantém o texto original quando o horário não pôde ser interpretado', () => {
    const [horario] = parseOpeningHours(['Aberto até 23h']);

    expect(formatOpeningRange(horario!)).toBe('Aberto até 23h');
  });
});

describe('openingStatusLabel', () => {
  it('informa que está aberto', () => {
    const horarios = parseOpeningHours(['Seg a Sex: 08h às 18h']);

    expect(openingStatusLabel(horarios, new Date(2026, 9, 21, 10, 0))).toBe('Aberto agora');
  });

  it('informa que está fechado', () => {
    const horarios = parseOpeningHours(['Seg a Sex: 08h às 18h']);

    expect(openingStatusLabel(horarios, new Date(2026, 9, 21, 21, 0))).toBe('Fechado agora');
  });

  it('informa que o horário é desconhecido', () => {
    expect(openingStatusLabel([], new Date(2026, 9, 21, 12, 0))).toBe('Horário não informado');
  });
});
