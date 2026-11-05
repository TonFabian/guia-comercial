import { describe, expect, it } from 'vitest';

import { parsePagination } from './http.js';
import {
  lerBooleano,
  lerEnum,
  lerInteiro,
  lerListaDeSlugs,
  lerTexto,
  parametroInvalido,
} from './query.js';

type ComStatusCode = Error & { statusCode: number };

/** Afirma que o erro lançado é um 400 com mensagem em português. */
function falha400(funcao: () => unknown): ComStatusCode {
  try {
    funcao();
  } catch (erro) {
    const erroTipado = erro as ComStatusCode;
    expect(erroTipado.statusCode).toBe(400);
    expect(erroTipado.message.length).toBeGreaterThan(0);
    return erroTipado;
  }
  expect.unreachable('a função deveria ter lançado erro com statusCode 400');
  throw new Error('inalcançável');
}

describe('parametroInvalido', () => {
  it('cria erro 400 com mensagem consistente', () => {
    const erro = parametroInvalido('q', 'valor não é texto');

    expect(erro.statusCode).toBe(400);
    expect(erro.message).toBe("Parâmetro inválido: 'q' — valor não é texto");
  });
});

describe('lerTexto', () => {
  it('parâmetro ausente → undefined', () => {
    expect(lerTexto(undefined)).toBeUndefined();
    expect(lerTexto(null)).toBeUndefined();
  });

  it('string válida aparada', () => {
    expect(lerTexto('  vila nova  ')).toBe('vila nova');
  });

  it('string vazia (ou só espaços) → undefined', () => {
    expect(lerTexto('')).toBeUndefined();
    expect(lerTexto('   ')).toBeUndefined();
  });

  it('array → 400', () => {
    falha400(() => lerTexto(['a', 'b']));
  });

  it('objeto → 400', () => {
    falha400(() => lerTexto({}));
  });

  it('string acima do limite de 120 → 400 com o limite na mensagem', () => {
    const erro = falha400(() => lerTexto('a'.repeat(121)));
    expect(erro.message).toContain('120');
  });

  it('string dentro do limite passa', () => {
    expect(lerTexto('a'.repeat(120))).toBe('a'.repeat(120));
  });

  it('respeita maxLength customizado', () => {
    expect(lerTexto('abc', { maxLength: 3 })).toBe('abc');
    falha400(() => lerTexto('abcd', { maxLength: 3 }));
  });

  it('comprimento abaixo de minLength → 400', () => {
    expect(lerTexto('abc', { minLength: 3 })).toBe('abc');
    falha400(() => lerTexto('ab', { minLength: 3 }));
  });

  it('remove caracteres de controle e null byte', () => {
    expect(lerTexto('vila\x00 nova\u0007')).toBe('vila nova');
    expect(lerTexto('\u001f abc')).toBe('abc');
    expect(lerTexto('abc\u007f')).toBe('abc');
  });

  it('número (não string) → 400', () => {
    falha400(() => lerTexto(42));
  });
});

describe('lerBooleano', () => {
  it('parâmetro ausente → undefined', () => {
    expect(lerBooleano(undefined)).toBeUndefined();
    expect(lerBooleano(null)).toBeUndefined();
  });

  it("'true' e 'false' (com espaços) são aceitos", () => {
    expect(lerBooleano('true')).toBe(true);
    expect(lerBooleano(' false ')).toBe(false);
  });

  it('string vazia → undefined', () => {
    expect(lerBooleano('')).toBeUndefined();
  });

  it('qualquer outro valor presente → 400', () => {
    falha400(() => lerBooleano('1'));
    falha400(() => lerBooleano('yes'));
  });

  it('array → 400', () => {
    falha400(() => lerBooleano(['true']));
  });

  it('booleano cru → 400', () => {
    falha400(() => lerBooleano(true));
  });
});

describe('lerInteiro', () => {
  it('parâmetro ausente → undefined', () => {
    expect(lerInteiro(undefined)).toBeUndefined();
    expect(lerInteiro(null)).toBeUndefined();
  });

  it("'12' → 12", () => {
    expect(lerInteiro('12')).toBe(12);
  });

  it('string vazia → undefined', () => {
    expect(lerInteiro('')).toBeUndefined();
  });

  it("'abc' → 400", () => {
    falha400(() => lerInteiro('abc'));
  });

  it("'-3' é numérico e respeita o clamp do min padrão (0)", () => {
    expect(lerInteiro('-3')).toBe(0);
  });

  it('array → 400', () => {
    falha400(() => lerInteiro(['12']));
  });

  it('objeto → 400', () => {
    falha400(() => lerInteiro({}));
  });

  it("decimal '1.5' → 400 (só inteiro)", () => {
    falha400(() => lerInteiro('1.5'));
  });

  it('clamp em [min, max]', () => {
    expect(lerInteiro('0', { min: 1 })).toBe(1);
    expect(lerInteiro('500', { max: 100 })).toBe(100);
    expect(lerInteiro('50', { min: 1, max: 100 })).toBe(50);
  });
});

describe('lerListaDeSlugs', () => {
  it('parâmetro ausente → undefined', () => {
    expect(lerListaDeSlugs(undefined)).toBeUndefined();
    expect(lerListaDeSlugs(null)).toBeUndefined();
  });

  it("string vazia → undefined", () => {
    expect(lerListaDeSlugs('')).toBeUndefined();
  });

  it("'a,b' → ['a', 'b']", () => {
    expect(lerListaDeSlugs('a,b')).toEqual(['a', 'b']);
  });

  it('normaliza: minúsculas, sem acento, espaços → hífen', () => {
    expect(lerListaDeSlugs('A, b')).toEqual(['a', 'b']);
    expect(lerListaDeSlugs('Café Central')).toEqual(['cafe-central']);
  });

  it("'a,,b' descarta vazios e não devolve item vazio", () => {
    expect(lerListaDeSlugs('a,,b')).toEqual(['a', 'b']);
  });

  it("item que não normaliza para nada ('---') é descartado", () => {
    expect(lerListaDeSlugs('a,---,b')).toEqual(['a', 'b']);
    expect(lerListaDeSlugs('---')).toBeUndefined();
  });

  it('array → 400', () => {
    falha400(() => lerListaDeSlugs(['a']));
  });

  it('objeto → 400', () => {
    falha400(() => lerListaDeSlugs({}));
  });

  it('mais de 20 itens → 400', () => {
    const trinta = Array.from({ length: 30 }, (_, i) => `slug-${i}`).join(',');
    falha400(() => lerListaDeSlugs(trinta));
  });

  it('exatamente 20 itens passa', () => {
    const vinte = Array.from({ length: 20 }, (_, i) => `slug-${i}`).join(',');
    expect(lerListaDeSlugs(vinte)).toHaveLength(20);
  });

  it('item acima de 64 caracteres → 400 com o limite na mensagem', () => {
    const erro = falha400(() => lerListaDeSlugs('a'.repeat(65)));
    expect(erro.message).toContain('64');
  });

  it('item de 64 caracteres passa', () => {
    expect(lerListaDeSlugs('a'.repeat(64))).toEqual(['a'.repeat(64)]);
  });

  it('respeita maxItens customizado', () => {
    falha400(() => lerListaDeSlugs('a,b,c', { maxItens: 2 }));
  });
});

describe('lerEnum', () => {
  const PAPEIS = ['admin', 'editor'] as const;

  it('parâmetro ausente → undefined', () => {
    expect(lerEnum(undefined, PAPEIS)).toBeUndefined();
  });

  it('string vazia → undefined', () => {
    expect(lerEnum('', PAPEIS)).toBeUndefined();
  });

  it('valor na lista', () => {
    expect(lerEnum('admin', PAPEIS)).toBe('admin');
    expect(lerEnum(' editor ', PAPEIS)).toBe('editor');
  });

  it('valor fora da lista → 400 listando os aceitos', () => {
    const erro = falha400(() => lerEnum('roque', PAPEIS));
    expect(erro.message).toContain('admin');
    expect(erro.message).toContain('editor');
  });

  it('não-string → 400', () => {
    falha400(() => lerEnum(['admin'], PAPEIS));
  });
});

describe('parsePagination', () => {
  it('valores válidos', () => {
    expect(parsePagination('3', '10')).toEqual({ page: 3, pageSize: 10, skip: 20, limit: 10 });
  });

  it('ausentes ou vazios → default', () => {
    expect(parsePagination(undefined, undefined)).toEqual({ page: 1, pageSize: 20, skip: 0, limit: 20 });
    expect(parsePagination('', '')).toEqual({ page: 1, pageSize: 20, skip: 0, limit: 20 });
  });

  it('array e objeto em page/pageSize → default (não quebra)', () => {
    expect(parsePagination(['1'], undefined)).toEqual({ page: 1, pageSize: 20, skip: 0, limit: 20 });
    expect(parsePagination(undefined, {})).toEqual({ page: 1, pageSize: 20, skip: 0, limit: 20 });
  });

  it('page acima do teto de 10000 → clamp', () => {
    const paginacao = parsePagination('99999', '20');
    expect(paginacao.page).toBe(10000);
    expect(paginacao.skip).toBe(9999 * 20);
    expect(paginacao.skip).toBeLessThanOrEqual(1_000_000);
  });

  it('page exatamente no teto não clampa', () => {
    expect(parsePagination('10000', '20').page).toBe(10000);
  });

  it('page/pageSize não numéricos → default', () => {
    expect(parsePagination('abc', '10')).toEqual({ page: 1, pageSize: 10, skip: 0, limit: 10 });
    expect(parsePagination('2', 'xyz')).toEqual({ page: 2, pageSize: 20, skip: 20, limit: 20 });
  });

  it('page 0 e negativo → 1', () => {
    expect(parsePagination('0', '20').page).toBe(1);
    expect(parsePagination('-5', '20').page).toBe(1);
  });

  it('pageSize continua limitado a 1..100', () => {
    expect(parsePagination('1', '500')).toEqual({ page: 1, pageSize: 100, skip: 0, limit: 100 });
    expect(parsePagination('1', '0')).toEqual({ page: 1, pageSize: 1, skip: 0, limit: 1 });
  });
});
