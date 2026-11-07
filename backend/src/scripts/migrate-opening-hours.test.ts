import { describe, expect, it } from 'vitest';

import { montarUpdate, planejarMigracao } from './migrate-opening-hours.js';

const SEGUNDA = [{ day: 1, opens: 480, closes: 1080 }];

describe('planejarMigracao', () => {
  it('empresa sem openingHours não precisa migrar (retorna null)', () => {
    expect(planejarMigracao(undefined, [])).toBeNull();
    expect(planejarMigracao([], [])).toBeNull();
  });

  it('empresa com schedule já preenchido não migra (idempotência)', () => {
    const agenda = [{ day: 1, opens: 480, closes: 1080 }];
    expect(planejarMigracao(['Seg: 08h às 18h'], agenda)).toBeNull();
  });

  it('linhas parseáveis viram itens de schedule', () => {
    const plano = planejarMigracao(['Seg a Sex: 08h às 18h'], []);
    expect(plano).toEqual({
      schedule: [
        { day: 1, opens: 480, closes: 1080 },
        { day: 2, opens: 480, closes: 1080 },
        { day: 3, opens: 480, closes: 1080 },
        { day: 4, opens: 480, closes: 1080 },
        { day: 5, opens: 480, closes: 1080 },
      ],
      naoParseaveis: [],
    });
  });

  it('linha não parseável fica em naoParseaveis para manter openingHours', () => {
    const plano = planejarMigracao(
      ['Seg a Sex: 08h às 18h', 'Feriados: consultar'],
      [],
    );
    expect(plano?.naoParseaveis).toEqual(['Feriados: consultar']);
    expect(plano?.schedule).toHaveLength(5);
  });

  it('openingHours só com linhas inválidas gera schedule vazio', () => {
    const plano = planejarMigracao(['24h por telefone'], []);
    expect(plano?.schedule).toEqual([]);
    expect(plano?.naoParseaveis).toEqual(['24h por telefone']);
  });
});

describe('montarUpdate', () => {
  it('com não parseáveis: $set salva schedule E openingHours no mesmo $set', () => {
    const update = montarUpdate({
      schedule: SEGUNDA,
      naoParseaveis: ['Feriados: consultar'],
    });
    // Um único $set com as duas chaves — a chave duplicada anterior descartava
    // o schedule silenciosamente.
    expect(update).toEqual({
      $set: {
        schedule: SEGUNDA,
        openingHours: ['Feriados: consultar'],
      },
    });
  });

  it('sem não parseáveis: $set só schedule e $unset remove openingHours', () => {
    const update = montarUpdate({ schedule: SEGUNDA, naoParseaveis: [] });
    expect(update).toEqual({
      $set: { schedule: SEGUNDA },
      $unset: { openingHours: '' },
    });
  });
});
