import { describe, expect, it } from 'vitest';

import { buildPaginationDots } from './pagination-dots';

describe('buildPaginationDots', () => {
  it('não cria dots quando há uma página ou menos', () => {
    expect(buildPaginationDots(1, 0)).toEqual([]);
    expect(buildPaginationDots(0, 0)).toEqual([]);
  });

  it('cria um dot por página e marca apenas o ativo', () => {
    expect(buildPaginationDots(3, 1)).toEqual([
      { index: 0, active: false },
      { index: 1, active: true },
      { index: 2, active: false },
    ]);
  });

  it('clampa índice negativo para o primeiro dot', () => {
    const dots = buildPaginationDots(3, -2);

    expect(dots.find((dot) => dot.active)?.index).toBe(0);
  });

  it('clampa índice acima do fim para o último dot', () => {
    const dots = buildPaginationDots(3, 99);

    expect(dots.find((dot) => dot.active)?.index).toBe(2);
  });
});
