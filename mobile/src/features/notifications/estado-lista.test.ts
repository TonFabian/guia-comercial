import { describe, it, expect } from 'vitest';

import { alternarSelecao, aplicarLeitura } from './estado-lista';
import type { AppNotification } from '@/types/domain';

const item = (id: string, lido = false): AppNotification => ({
  _id: id,
  clerkId: 'c1',
  type: 'coupon',
  title: 'T',
  body: 'B',
  deepLink: '/company/x',
  refId: id,
  readAt: lido ? '2026-01-01T00:00:00.000Z' : null,
});

describe('alternarSelecao', () => {
  it('adiciona id inédito', () => {
    expect(alternarSelecao([], 'a')).toEqual(['a']);
  });
  it('remove id já selecionado', () => {
    expect(alternarSelecao(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('aplicarLeitura', () => {
  it('marca lidos apenas os selecionados', () => {
    const itens = [item('a'), item('b')];
    const resultado = aplicarLeitura(itens, ['a'], true);
    expect(resultado.find((n) => n._id === 'a')?.readAt).toBeTruthy();
    expect(resultado.find((n) => n._id === 'b')?.readAt).toBeNull();
  });

  it('marca não lidos apenas os selecionados', () => {
    const itens = [item('a', true), item('b', true)];
    const resultado = aplicarLeitura(itens, ['b'], false);
    expect(resultado.find((n) => n._id === 'a')?.readAt).toBeTruthy();
    expect(resultado.find((n) => n._id === 'b')?.readAt).toBeNull();
  });

  it('seleção vazia devolve lista inalterada', () => {
    const itens = [item('a', true)];
    expect(aplicarLeitura(itens, [], false)).toEqual(itens);
  });
});
