import { describe, expect, it } from 'vitest';

import {
  classificarEvento,
  descreverEntrada,
  descreverIngresso,
  formatarDataEvento,
  formatarHorario,
  formatarPeriodoEvento,
  labelCategoriaAtracao,
  labelCategoriaEvento,
} from './event-meta';

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
