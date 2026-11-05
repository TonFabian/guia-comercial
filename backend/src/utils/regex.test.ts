import { describe, expect, it } from 'vitest';

import { escapeRegex } from './regex.js';

describe('escapeRegex', () => {
  it('escapa cada metacaractere de expressão regular', () => {
    expect(escapeRegex('.')).toBe('\\.');
    expect(escapeRegex('(')).toBe('\\(');
    expect(escapeRegex(')')).toBe('\\)');
    expect(escapeRegex('*')).toBe('\\*');
    expect(escapeRegex('+')).toBe('\\+');
    expect(escapeRegex('?')).toBe('\\?');
    expect(escapeRegex('[')).toBe('\\[');
    expect(escapeRegex(']')).toBe('\\]');
    expect(escapeRegex('^')).toBe('\\^');
    expect(escapeRegex('$')).toBe('\\$');
    expect(escapeRegex('|')).toBe('\\|');
    expect(escapeRegex('\\')).toBe('\\\\');
  });

  it('não altera texto sem metacaractere', () => {
    expect(escapeRegex('cachoeira do retiro')).toBe('cachoeira do retiro');
  });

  it('escapa metacaracteres em qualquer posição do texto', () => {
    expect(escapeRegex('cachoeira(vila)')).toBe('cachoeira\\(vila\\)');
    expect(escapeRegex('R$ 10,00')).toBe('R\\$ 10,00');
  });

  it('o texto escapado usado em new RegExp casa literalmente, sem erro', () => {
    const termo = '(x)*+?[]^$|\\cachoeira.';
    const regex = new RegExp(escapeRegex(termo), 'i');

    expect(regex.test('(x)*+?[]^$|\\cachoeira.')).toBe(true);
    expect(regex.test('cachoeira')).toBe(false);
  });
});
