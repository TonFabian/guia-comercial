import { describe, expect, it } from 'vitest';

import { DEEP_LINK_PADRAO, ehDeepLinkValido } from './deep-link';

describe('ehDeepLinkValido', () => {
  it('aceita a rota raiz', () => {
    expect(ehDeepLinkValido('/')).toBe(true);
  });

  it('aceita /company/abc123', () => {
    expect(ehDeepLinkValido('/company/abc123')).toBe(true);
  });

  it('rejeita /company/abc123/deep (segmento extra)', () => {
    expect(ehDeepLinkValido('/company/abc123/deep')).toBe(false);
  });

  it('rejeita /coupon/x', () => {
    expect(ehDeepLinkValido('/coupon/x')).toBe(false);
  });

  it('rejeita URL https', () => {
    expect(ehDeepLinkValido('https://x.com')).toBe(false);
  });

  it('rejeita //', () => {
    expect(ehDeepLinkValido('//')).toBe(false);
  });
});

describe('deep-link parity (mobile vs backend)', () => {
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
    expect(DEEP_LINK_PADRAO).toEqual(backend);
  });
});