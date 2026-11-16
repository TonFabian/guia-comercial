import { describe, expect, it } from 'vitest';

import { totalDoRodape } from './filter';

describe('contagem do rodapé de paginação', () => {
  it('sem filtro de cliente ativo, exibe o total do servidor', () => {
    expect(totalDoRodape(10, false, 9)).toBe(10);
  });

  it('com filtro de cliente ativo, exibe a contagem dos itens visíveis', () => {
    expect(totalDoRodape(10, true, 9)).toBe(9);
  });

  it('com filtro ativo e nenhum item visível, exibe zero', () => {
    expect(totalDoRodape(10, true, 0)).toBe(0);
  });
});
