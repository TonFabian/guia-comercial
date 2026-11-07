import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateProductionConfig } from './config.js';

describe('validateProductionConfig', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalClerk = process.env.CLERK_SECRET_KEY;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.CLERK_SECRET_KEY;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalClerk === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = originalClerk;
  });

  it('não lança fora de produção', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateProductionConfig()).not.toThrow();
  });

  it('não lança em produção com CLERK_SECRET_KEY', () => {
    process.env.NODE_ENV = 'production';
    process.env.CLERK_SECRET_KEY = 'sk_test';
    expect(() => validateProductionConfig()).not.toThrow();
  });

  it('lança em produção sem CLERK_SECRET_KEY', () => {
    process.env.NODE_ENV = 'production';
    expect(() => validateProductionConfig()).toThrow(
      'CLERK_SECRET_KEY obrigatório em produção',
    );
  });
});