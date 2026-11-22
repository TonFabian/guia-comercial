import { describe, expect, it } from 'vitest';

import { PORTA_API_PADRAO, resolveApiBaseUrl } from './api-url';

describe('resolveApiBaseUrl', () => {
  it('prioriza a URL explícita (produção/override manual)', () => {
    expect(
      resolveApiBaseUrl({
        explicitUrl: 'https://api.guia.com.br/api',
        hostUri: '192.168.1.106:8081',
        dev: true,
      }),
    ).toBe('https://api.guia.com.br/api');
  });

  it('ignora URL explícita em branco e deriva do host do Expo', () => {
    expect(
      resolveApiBaseUrl({
        explicitUrl: '   ',
        hostUri: '192.168.1.106:8081',
        dev: true,
      }),
    ).toBe(`http://192.168.1.106:${PORTA_API_PADRAO}/api`);
  });

  it('deriva do hostUri descartando a porta do Metro', () => {
    expect(resolveApiBaseUrl({ hostUri: '192.168.1.106:8081', dev: true })).toBe(
      `http://192.168.1.106:${PORTA_API_PADRAO}/api`,
    );
  });

  it('funciona com hostUri localhost (simulador/web)', () => {
    expect(resolveApiBaseUrl({ hostUri: 'localhost:8081', dev: true })).toBe(
      `http://localhost:${PORTA_API_PADRAO}/api`,
    );
  });

  it('aceita hostUri com esquema', () => {
    expect(resolveApiBaseUrl({ hostUri: 'exp://192.168.1.106:8081', dev: true })).toBe(
      `http://192.168.1.106:${PORTA_API_PADRAO}/api`,
    );
  });

  it('sem hostUri em desenvolvimento não configura a API (cai no mock)', () => {
    expect(resolveApiBaseUrl({ dev: true })).toBeUndefined();
  });

  it('fora do desenvolvimento não deriva hostUri (produção exige URL explícita)', () => {
    expect(resolveApiBaseUrl({ hostUri: '192.168.1.106:8081', dev: false })).toBeUndefined();
  });

  it('usa a URL do bundle do Metro quando o hostUri não existe (dev build)', () => {
    expect(
      resolveApiBaseUrl({ bundleUrl: 'http://192.168.1.77:8081/', dev: true }),
    ).toBe(`http://192.168.1.77:${PORTA_API_PADRAO}/api`);
  });

  it('prefere o hostUri do Expo à URL do bundle quando ambos existem', () => {
    expect(
      resolveApiBaseUrl({
        hostUri: '192.168.1.106:8081',
        bundleUrl: 'http://10.0.0.2:8081/',
        dev: true,
      }),
    ).toBe(`http://192.168.1.106:${PORTA_API_PADRAO}/api`);
  });

  it('não usa a URL do bundle fora do desenvolvimento', () => {
    expect(
      resolveApiBaseUrl({ bundleUrl: 'http://192.168.1.77:8081/', dev: false }),
    ).toBeUndefined();
  });
});
