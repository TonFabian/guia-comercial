import { describe, expect, it } from 'vitest';

import { devServerUrl } from './dev-server-url';

const getDevServer =
  (url: string, bundleLoadedFromServer: boolean) => () => ({ url, bundleLoadedFromServer });

describe('devServerUrl', () => {
  it('devolve a URL quando o módulo expõe o getDevServer como default (ESM)', () => {
    expect(devServerUrl(() => ({ default: getDevServer('http://192.168.1.77:8081/', true) }))).toBe(
      'http://192.168.1.77:8081/',
    );
  });

  it('devolve a URL quando o módulo exporta o getDevServer diretamente (CJS)', () => {
    expect(devServerUrl(() => getDevServer('http://192.168.1.77:8081/', true))).toBe(
      'http://192.168.1.77:8081/',
    );
  });

  it('devolve undefined quando o bundle não veio do dev server (produção)', () => {
    expect(
      devServerUrl(() => ({ default: getDevServer('http://localhost:8081/', false) })),
    ).toBeUndefined();
  });

  it('devolve undefined quando o React Native não resolve (Node/Vitest)', () => {
    expect(devServerUrl()).toBeUndefined();
  });
});
