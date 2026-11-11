import { describe, expect, it } from 'vitest';

import { isObjectId } from './analytics.service.js';

describe('analytics.service', () => {
  it('isObjectId aceita id valido de 24 hex', () => {
    expect(isObjectId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('isObjectId rejeita id malformado', () => {
    expect(isObjectId('nao-e-id')).toBe(false);
    expect(isObjectId('')).toBe(false);
  });
});