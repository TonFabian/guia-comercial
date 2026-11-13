import { describe, it, expect } from 'vitest';

import { DEEP_LINK_ROTAS } from './deep-link';

describe('deep-link parity (admin vs backend)', () => {
  it('espelha literalmente a whitelist do backend', () => {
    const backend = [
      { prefixo: '/', exato: true },
      { prefixo: '/(tabs)/search', exato: true },
      { prefixo: '/(tabs)/favorites', exato: true },
      { prefixo: '/(tabs)/profile', exato: true },
      { prefixo: '/company/', exato: false },
      { prefixo: '/event/', exato: false },
      { prefixo: '/tourist-spot/', exato: false },
      { prefixo: '/job/', exato: false },
      { prefixo: '/autonomous/', exato: false },
      { prefixo: '/map', exato: true },
      { prefixo: '/my-company', exato: true },
      { prefixo: '/announce', exato: true },
    ];
    expect(DEEP_LINK_ROTAS).toEqual(backend);
  });
});