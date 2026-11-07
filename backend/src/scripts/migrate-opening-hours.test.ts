import { describe, expect, it } from 'vitest';

import { planejarMigracao } from './migrate-opening-hours.js';

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
