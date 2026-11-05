import { describe, expect, it } from 'vitest';

import { buildCouponQuery } from './coupon.service.js';

const EMPRESA_ID = '507f1f77bcf86cd799439011';

type ComStatusCode = Error & { statusCode: number };

function statusCodeDoErro(funcao: () => unknown): number {
  try {
    funcao();
  } catch (erro) {
    return (erro as ComStatusCode).statusCode ?? 0;
  }
  expect.unreachable('a função deveria ter lançado erro');
  return 0;
}

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

  it('parâmetro não string (array de `?company=a&company=b`) → 400 nomeado', () => {
    const statusCode = statusCodeDoErro(() => buildCouponQuery({ company: ['a', 'b'] }));

    expect(statusCode).toBe(400);
    expect(() => buildCouponQuery({ company: ['a', 'b'] })).toThrowError(/'company'/);
  });
});
