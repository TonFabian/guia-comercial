import { describe, expect, it } from 'vitest';

import { spotOptionValue } from './spot-option';

describe('spotOptionValue', () => {
  it('devolve vazio quando não há referência', () => {
    expect(spotOptionValue(undefined, [])).toBe('');
    expect(spotOptionValue(null, [])).toBe('');
  });

  it('preserva o id quando a atração está na lista', () => {
    const spots = [{ _id: '000000000000000000000050' }];
    expect(spotOptionValue('000000000000000000000050', spots)).toBe('000000000000000000000050');
  });

  it('PRESERVA o id quando a atração foi excluída (não está na lista)', () => {
    // Caso contrário o PUT substituiria a programação e apagaria a referência
    // silenciosamente.
    const spots = [{ _id: '000000000000000000000050' }];
    expect(spotOptionValue('000000000000000000000099', spots)).toBe('000000000000000000000099');
  });

  it('preserva o id de uma referência populada (objeto)', () => {
    const spots = [{ _id: '000000000000000000000050' }];
    expect(spotOptionValue({ _id: '000000000000000000000077' }, spots)).toBe(
      '000000000000000000000077',
    );
  });
});
