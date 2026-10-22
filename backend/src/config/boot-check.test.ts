import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertValidClerkConfiguration, warnIfWithoutAuthentication } from './boot-check.js';

describe('warnIfWithoutAuthentication', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('avisa em produção que a API ficou sem autenticação', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnIfWithoutAuthentication({ NODE_ENV: 'production' });

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/sem autenticação/i));
  });

  it('não avisa quando CLERK_SECRET_KEY está definida', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnIfWithoutAuthentication({
      NODE_ENV: 'production',
      CLERK_SECRET_KEY: 'sk_test_placeholder',
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it('não avisa fora de produção', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnIfWithoutAuthentication({ NODE_ENV: 'development' });

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('assertValidClerkConfiguration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aceita o par de chaves completo sem lançar nem avisar', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      assertValidClerkConfiguration({
        CLERK_SECRET_KEY: 'sk_test_placeholder',
        CLERK_PUBLISHABLE_KEY: 'pk_test_placeholder',
      }),
    ).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it('lança mensagem clara quando há secret sem publishable', () => {
    expect(() =>
      assertValidClerkConfiguration({ CLERK_SECRET_KEY: 'sk_test_placeholder' }),
    ).toThrow(/CLERK_PUBLISHABLE_KEY/);
  });

  it('não interfere no modo legado sem secret', () => {
    expect(() => assertValidClerkConfiguration({})).not.toThrow();
  });
});
