import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  agruparProgramacaoPorDia,
  classificarEvento,
  descreverEntrada,
  descreverIngresso,
  descreverIngressoItem,
  formatarDataEvento,
  formatarHorario,
  formatarPeriodoEvento,
  hojeISO,
  labelCategoriaAtracao,
  labelCategoriaEvento,
} from './event-meta';
import type { DiaProgramacao } from './event-meta';
import type { TourEventScheduleItem } from '@/types/domain';

describe('formatarDataEvento', () => {
  it('formata a data em pt-BR parseando as partes (sem new Date/fuso)', () => {
    expect(formatarDataEvento('2026-11-12')).toBe('12 de nov');
    expect(formatarDataEvento('2026-12-02')).toBe('2 de dez');
  });
});

describe('formatarPeriodoEvento', () => {
  it('mostra só a data quando começa e termina no mesmo dia', () => {
    expect(formatarPeriodoEvento('2026-11-12', '2026-11-12')).toBe('12 de nov');
  });

  it('mostra o intervalo de dias quando é o mesmo mês', () => {
    expect(formatarPeriodoEvento('2026-11-12', '2026-11-14')).toBe('12–14 de nov');
  });

  it('mostra as duas datas completas quando os meses são diferentes', () => {
    expect(formatarPeriodoEvento('2026-11-28', '2026-12-02')).toBe('28 de nov – 2 de dez');
  });
});

describe('hojeISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('segue o fuso de Fortaleza, não o do dispositivo (en-CA → YYYY-MM-DD)', () => {
    // 01:30Z de 06/11 = 22:30 de 05/11 em Fortaleza (UTC-3): o "hoje" do guia
    // ainda é 05/11, mesmo que o relógio universal já esteja no dia seguinte.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T01:30:00Z'));
    expect(hojeISO()).toBe('2026-11-05');
  });
});

describe('classificarEvento', () => {
  it('classifica como em-breve quando o início é futura (comparação lexicográfica)', () => {
    expect(classificarEvento('2026-12-05', '2026-12-07', '2026-11-05')).toBe('em-breve');
  });

  it('classifica como agora quando hoje cai dentro do período', () => {
    expect(classificarEvento('2026-11-04', '2026-11-08', '2026-11-05')).toBe('agora');
    expect(classificarEvento('2026-11-05', '2026-11-05', '2026-11-05')).toBe('agora');
  });

  it('classifica como encerrado quando a data de fim já passou', () => {
    expect(classificarEvento('2026-11-01', '2026-11-03', '2026-11-05')).toBe('encerrado');
  });
});

describe('formatarHorario', () => {
  it('junta início e fim com "às" quando os dois existem', () => {
    expect(formatarHorario('10:00', '23:00')).toBe('10:00 às 23:00');
  });

  it('mostra só o início quando não há horário de fim', () => {
    expect(formatarHorario('10:00')).toBe('10:00');
  });

  it('devolve null quando não há horário informado', () => {
    expect(formatarHorario()).toBeNull();
    expect(formatarHorario(undefined, '23:00')).toBeNull();
  });
});

describe('descreverEntrada', () => {
  it('descreve entrada gratuita', () => {
    expect(descreverEntrada('free')).toBe('Entrada gratuita');
  });

  it('descreve entrada paga com o preço informado', () => {
    expect(descreverEntrada('paid', 'R$ 10,00')).toBe('Entrada: R$ 10,00');
  });

  it('descreve entrada paga sem preço como valor sob consulta', () => {
    expect(descreverEntrada('paid')).toBe('Entrada paga');
  });

  it('descreve entrada por doação', () => {
    expect(descreverEntrada('donation')).toBe('Aceita doações');
  });

  it('devolve null quando não há informação de entrada', () => {
    expect(descreverEntrada()).toBeNull();
  });
});

describe('descreverIngresso', () => {
  it('descreve ingresso gratuito', () => {
    expect(descreverIngresso('free')).toBe('Ingresso gratuito');
  });

  it('descreve ingresso pago com o preço informado', () => {
    expect(descreverIngresso('paid', 'R$ 30,00')).toBe('Ingresso: R$ 30,00');
  });

  it('descreve ingresso pago sem preço como valor sob consulta', () => {
    expect(descreverIngresso('paid')).toBe('Ingresso pago');
  });

  it('devolve null quando não há informação de ingresso', () => {
    expect(descreverIngresso()).toBeNull();
  });
});

describe('descreverIngressoItem', () => {
  it('herda o ingresso do evento quando o item não define o seu', () => {
    expect(descreverIngressoItem({}, 'paid', 'R$ 30,00')).toBe('Ingresso: R$ 30,00');
    expect(descreverIngressoItem({}, 'free')).toBe('Ingresso gratuito');
  });

  it('não herda o preço do evento quando o item define o próprio ingresso', () => {
    // Item gratuito não pode exibir o preço do evento (que é de outro ingresso).
    expect(descreverIngressoItem({ ticket: 'free' }, 'paid', 'R$ 30,00')).toBe('Ingresso gratuito');
  });

  it('não usa o preço do evento quando o item é pago sem preço próprio', () => {
    expect(descreverIngressoItem({ ticket: 'paid' }, 'free', 'R$ 30,00')).toBe('Ingresso pago');
    expect(descreverIngressoItem({ ticket: 'paid', ticketPrice: 'R$ 10,00' })).toBe('Ingresso: R$ 10,00');
  });

  it('devolve null quando nem o item nem o evento têm ingresso', () => {
    expect(descreverIngressoItem({})).toBeNull();
  });
});

describe('labelCategoriaAtracao', () => {
  it('traduz as categorias de atração para pt-BR', () => {
    expect(labelCategoriaAtracao('park')).toBe('Parque');
    expect(labelCategoriaAtracao('waterfall')).toBe('Cachoeira');
    expect(labelCategoriaAtracao('viewpoint')).toBe('Mirante');
    expect(labelCategoriaAtracao('nature')).toBe('Natureza');
    expect(labelCategoriaAtracao('adventure')).toBe('Aventura');
    expect(labelCategoriaAtracao('other')).toBe('Outro');
  });
});

describe('labelCategoriaEvento', () => {
  it('traduz as categorias de evento para pt-BR', () => {
    expect(labelCategoriaEvento('festival')).toBe('Festival');
    expect(labelCategoriaEvento('fair')).toBe('Feira');
    expect(labelCategoriaEvento('exhibition')).toBe('Exposição');
    expect(labelCategoriaEvento('workshop')).toBe('Oficina');
    expect(labelCategoriaEvento('other')).toBe('Outro');
  });
});

/** Item de teste com dados mínimos. */
function item(dia: string, dados: Omit<TourEventScheduleItem, 'date'>): TourEventScheduleItem {
  return { date: dia, ...dados };
}

describe('agruparProgramacaoPorDia', () => {
  const DIA_05 = '2026-11-05';
  const DIA_06 = '2026-11-06';
  const DIA_07 = '2026-11-07';

  it('agrupa os itens pela data e devolve os dias em ordem crescente', () => {
    const dias = agruparProgramacaoPorDia([
      item(DIA_06, { title: 'Feira de artesanato' }),
      item(DIA_05, { title: 'Xote da abertura' }),
      item(DIA_05, { title: 'Forró do Nato' }),
      item(DIA_07, { title: 'Show de encerramento' }),
    ]);

    expect(dias.map((d) => d.date)).toEqual([DIA_05, DIA_06, DIA_07]);
    // Sem startTime no mesmo dia: ordem alfabética de title.
    expect(dias[0]?.items.map((i) => i.title)).toEqual(['Forró do Nato', 'Xote da abertura']);
    expect(dias[1]?.items.map((i) => i.title)).toEqual(['Feira de artesanato']);
  });

  it('ordena os itens do dia por startTime (mais cedo primeiro)', () => {
    const dias = agruparProgramacaoPorDia([
      item(DIA_05, { startTime: '19:00', title: 'Forró do Nato' }),
      item(DIA_05, { startTime: '09:00', title: 'Caminhada ecológica' }),
    ]);

    expect(dias[0]?.items.map((i) => i.title)).toEqual(['Caminhada ecológica', 'Forró do Nato']);
  });

  it('leva os itens sem startTime ao fim do dia, em ordem alfabética de title', () => {
    const dias = agruparProgramacaoPorDia([
      item(DIA_05, { title: 'Feira de artesanato' }),
      item(DIA_05, { startTime: '19:00', title: 'Forró do Nato' }),
      item(DIA_05, { title: 'Banda no palco' }),
      item(DIA_05, { startTime: '09:00', title: 'Caminhada ecológica' }),
    ]);

    expect(dias[0]?.items.map((i) => i.title)).toEqual([
      'Caminhada ecológica',
      'Forró do Nato',
      'Banda no palco',
      'Feira de artesanato',
    ]);
  });

  it('devolve itens ao fim mesmo quando todos do dia não têm startTime', () => {
    const dias = agruparProgramacaoPorDia([
      item(DIA_05, { title: 'Zumba na praça' }),
      item(DIA_05, { title: 'Festival de quadrilha' }),
    ]);

    expect(dias[0]?.items.map((i) => i.title)).toEqual(['Festival de quadrilha', 'Zumba na praça']);
  });

  it('forma o shape DiaProgramacao esperado pela tela', () => {
    const dias: DiaProgramacao[] = agruparProgramacaoPorDia([
      item(DIA_05, { title: 'Xote da abertura' }),
    ]);
    expect(dias).toEqual([{ date: DIA_05, items: [item(DIA_05, { title: 'Xote da abertura' })] }]);
  });

  it('devolve lista vazia para programação vazia ou ausente', () => {
    expect(agruparProgramacaoPorDia([])).toEqual([]);
    expect(agruparProgramacaoPorDia(undefined)).toEqual([]);
  });

  it('não muta a lista original recebida (imutabilidade)', () => {
    const original = [
      item(DIA_05, { title: 'Feira de artesanato' }),
      item(DIA_05, { startTime: '09:00', title: 'Caminhada ecológica' }),
    ];
    agruparProgramacaoPorDia(original);
    expect(original[0]?.title).toBe('Feira de artesanato');
  });
});
