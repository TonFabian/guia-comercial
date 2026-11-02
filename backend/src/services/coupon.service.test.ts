import { describe, expect, it } from 'vitest';

import { buildCouponQuery } from './coupon.service.js';

const EMPRESA_ID = '507f1f77bcf86cd799439011';

describe('buildCouponQuery', () => {
  it('não filtra quando a empresa não é informada', () => {
    expect(buildCouponQuery({})).toEqual({});
    expect(buildCouponQuery({ company: '' })).toEqual({});
  });

  it('filtra pelo id da empresa quando ela é informada', () => {
    expect(buildCouponQuery({ company: EMPRESA_ID })).toEqual({ company: EMPRESA_ID });
  });

  it('gera consulta sem resultados para id de empresa inválido', () => {
    const query = buildCouponQuery({ company: 'nao-e-um-object-id' });

    expect(query.company).toMatch(/^[0-9a-f]{24}$/);
    expect(query.company).not.toBe('nao-e-um-object-id');
  });
});
