import { describe, expect, it } from 'vitest';
import { createElement } from 'react';

import { isTextCell } from './table';

describe('células de texto da tabela', () => {
  it('string e número são texto puro (recebem ellipsis)', () => {
    expect(isTextCell('Construtora Alicerce')).toBe(true);
    expect(isTextCell(42)).toBe(true);
  });

  it('elementos (chips de plano, ações) não recebem ellipsis', () => {
    expect(isTextCell(createElement('span'))).toBe(false);
    expect(isTextCell(null)).toBe(false);
    expect(isTextCell(undefined)).toBe(false);
  });
});
