import { describe, expect, it } from 'vitest';

import {
  EMPTY_SCHEDULE_ITEM,
  moverItemProgramacao,
  validarItemProgramacao,
  validarProgramacao,
} from './schedule-editor';
import type { TourEventScheduleItemForm } from './schedule-editor';

/** Item da programação com título (o resto fica no vazio do formulário). */
function item(titulo: string): TourEventScheduleItemForm {
  return { ...EMPTY_SCHEDULE_ITEM, title: titulo };
}

describe('moverItemProgramacao', () => {
  it('move o item para cima, trocando de lugar com o anterior', () => {
    const itens = [item('A'), item('B'), item('C')];

    const movidos = moverItemProgramacao(itens, 2, -1);

    expect(movidos.map((entrada) => entrada.title)).toEqual(['A', 'C', 'B']);
  });

  it('move o item para baixo, trocando de lugar com o seguinte', () => {
    const itens = [item('A'), item('B'), item('C')];

    const movidos = moverItemProgramacao(itens, 0, 1);

    expect(movidos.map((entrada) => entrada.title)).toEqual(['B', 'A', 'C']);
  });

  it('não move o primeiro item para cima nem o último para baixo', () => {
    const itens = [item('A'), item('B')];

    expect(moverItemProgramacao(itens, 0, -1).map((entrada) => entrada.title)).toEqual([
      'A',
      'B',
    ]);
    expect(moverItemProgramacao(itens, 1, 1).map((entrada) => entrada.title)).toEqual([
      'A',
      'B',
    ]);
  });

  it('não mexe na lista original (imutabilidade)', () => {
    const itens = [item('A'), item('B')];

    moverItemProgramacao(itens, 0, 1);

    expect(itens.map((entrada) => entrada.title)).toEqual(['A', 'B']);
  });
});

describe('validarItemProgramacao', () => {
  const base = { ...EMPTY_SCHEDULE_ITEM, title: 'Show', date: '2026-11-08' };

  it('aceita item dentro do intervalo do evento', () => {
    expect(validarItemProgramacao(base, '2026-11-07', '2026-11-09')).toEqual({});
  });

  it('rejeita data fora do intervalo do evento', () => {
    const erros = validarItemProgramacao(
      { ...base, date: '2026-11-20' },
      '2026-11-07',
      '2026-11-09',
    );

    expect(erros.date).toBeTruthy();
  });

  it('rejeita data que não existe no calendário', () => {
    const erros = validarItemProgramacao(
      { ...base, date: '2026-02-30' },
      '2026-11-07',
      '2026-11-09',
    );

    expect(erros.date).toBeTruthy();
  });

  it('rejeita fim antes do início', () => {
    const erros = validarItemProgramacao(
      { ...base, startTime: '10:00', endTime: '09:00' },
      '2026-11-07',
      '2026-11-09',
    );

    expect(erros.endTime).toBeTruthy();
  });

  it('rejeita item pago sem preço', () => {
    const erros = validarItemProgramacao(
      { ...base, ticket: 'paid' },
      '2026-11-07',
      '2026-11-09',
    );

    expect(erros.ticketPrice).toBeTruthy();
  });
});

describe('validarProgramacao', () => {
  it('devolve a mensagem do primeiro erro, com o número do item', () => {
    const mensagem = validarProgramacao(
      [
        { ...EMPTY_SCHEDULE_ITEM, title: 'Show', date: '2026-11-08' },
        { ...EMPTY_SCHEDULE_ITEM, title: '', date: '2026-11-08' },
      ],
      '2026-11-07',
      '2026-11-09',
    );

    expect(mensagem).toContain('Item 2');
  });

  it('devolve null quando todos os itens são válidos', () => {
    const mensagem = validarProgramacao(
      [{ ...EMPTY_SCHEDULE_ITEM, title: 'Show', date: '2026-11-08' }],
      '2026-11-07',
      '2026-11-09',
    );

    expect(mensagem).toBeNull();
  });
});
