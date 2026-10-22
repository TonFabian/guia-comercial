import { afterEach, describe, expect, it, vi } from 'vitest';

import { warnIfWithoutAuthentication } from './boot-check.js';

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
