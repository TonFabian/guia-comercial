import { describe, expect, it } from 'vitest';

import { montarEventosTuristicos } from './seed-turismo.js';

/** Datas fixas do festival (o seed calcula as reais a partir de hoje). */
const DATAS = {
  inicioFestival: '2026-12-10',
  segundoDiaFestival: '2026-12-11',
  fimFestival: '2026-12-12',
  inicioFeira: '2026-12-10',
};

/** Ids das atrações cadastradas (o seed resolve os slugs depois de inseri-las). */
const IDS_DAS_ATRACOES = new Map([
  ['canyon-do-rio-poti', '000000000000000000000051'],
  ['cachoeiras-do-rio-poti', '000000000000000000000052'],
]);

function montar() {
  return montarEventosTuristicos(DATAS, '000000000000000000000001', IDS_DAS_ATRACOES);
}

function festival() {
  const evento = montar().find((item) => item.name === 'Cânyon Fest Poti');
  if (!evento) throw new Error('evento do festival não encontrado');
  return evento;
}

function programacao() {
  return festival().schedule ?? [];
}

describe('montarEventosTuristicos', () => {
  it('cria o festival e a feira do Rio Poti', () => {
    const eventos = montar();
    expect(eventos.map((evento) => evento.name)).toEqual([
      'Cânyon Fest Poti',
      'Feira do Rio Poti',
    ]);
  });

  it('programa o festival em 3 dias', () => {
    const dias = new Set(programacao().map((item) => item.date));
    expect([...dias].sort()).toEqual([
      '2026-12-10',
      '2026-12-11',
      '2026-12-12',
    ]);
  });

  it('mantém toda data de item dentro do intervalo do evento', () => {
    const evento = festival();
    for (const item of programacao()) {
      expect(item.date >= evento.startDate).toBe(true);
      expect(item.date <= evento.endDate).toBe(true);
    }
  });

  it('programa pelo menos 2 itens por dia', () => {
    const porDia = new Map<string, number>();
    for (const item of programacao()) {
      porDia.set(item.date, (porDia.get(item.date) ?? 0) + 1);
    }
    for (const [, total] of porDia) {
      expect(total).toBeGreaterThanOrEqual(2);
    }
  });

  it('usa mais de um palco na programação', () => {
    const palcos = new Set(programacao().map((item) => item.stage));
    expect(palcos.size).toBeGreaterThan(1);
  });

  it('inclui um item sem horário (a ordenação do app joga para o fim do dia)', () => {
    expect(programacao().some((item) => !item.startTime)).toBe(true);
  });

  it('exige o preço no item com ingresso pago', () => {
    for (const item of programacao()) {
      if (item.ticket === 'paid') {
        expect(item.ticketPrice).toBeTruthy();
      }
    }
  });

  it('referencia as atrações pelo id resolvido (não pelo slug)', () => {
    const idsConhecidos = [...IDS_DAS_ATRACOES.values()];
    const referencias = programacao()
      .map((item) => item.relatedSpot)
      .filter((id): id is string => typeof id === 'string');
    expect(referencias.length).toBeGreaterThan(0);
    for (const id of referencias) {
      expect(idsConhecidos).toContain(id);
    }
  });

  it('não grava a referência quando a atração não existe', () => {
    const evento = montarEventosTuristicos(
      DATAS,
      '000000000000000000000001',
      new Map<string, string>(),
    );
    const itens = evento.find((item) => item.name === 'Cânyon Fest Poti')?.schedule ?? [];
    expect(itens.some((item) => 'relatedSpot' in item)).toBe(false);
  });

  it('deixa a feira sem programação', () => {
    const feira = montar().find((item) => item.name === 'Feira do Rio Poti');
    expect(feira?.schedule).toBeUndefined();
  });
});
