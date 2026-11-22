import { describe, expect, it } from 'vitest';

import { pageIndexFromOffset } from './carousel-page';

describe('pageIndexFromOffset', () => {
  it('mantém o primeiro índice no início', () => {
    expect(pageIndexFromOffset(0, 320, 3)).toBe(0);
  });

  it('avança um índice ao deslocar exatamente uma página', () => {
    expect(pageIndexFromOffset(320, 320, 3)).toBe(1);
  });

  it('arredonda para a página mais próxima', () => {
    expect(pageIndexFromOffset(449, 320, 3)).toBe(1);
    expect(pageIndexFromOffset(480, 320, 3)).toBe(2);
  });

  it('não retorna índice negativo', () => {
    expect(pageIndexFromOffset(-40, 320, 3)).toBe(0);
  });

  it('limita ao último índice', () => {
    expect(pageIndexFromOffset(2000, 320, 3)).toBe(2);
  });

  it('retorna zero quando há apenas uma página', () => {
    expect(pageIndexFromOffset(320, 320, 1)).toBe(0);
  });

  it('retorna zero quando a largura da página é inválida', () => {
    expect(pageIndexFromOffset(320, 0, 3)).toBe(0);
  });

  it('marca a última página quando a rolagem chega ao fim', () => {
    expect(pageIndexFromOffset(341, 232, 3, 341)).toBe(2);
  });

  it('ignora o fim quando o tamanho da rolagem ainda não foi medido', () => {
    expect(pageIndexFromOffset(0, 232, 3, 0)).toBe(0);
  });
});
