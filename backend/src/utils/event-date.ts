/**
 * Regra de expiração de eventos por DATA (spec D9).
 *
 * Só lidamos com strings de data pura (formato fixo YYYY-MM-DD) — nunca com
 * datetime ISO: comparações lexicográficas só são corretas nesse formato.
 * O "hoje" do guia é o dia de Fortaleza (Piauí, UTC-3, sem horário de verão).
 */

const FUSO_FORTALEZA = 'America/Fortaleza';

/** Dia de hoje no fuso do guia, como `YYYY-MM-DD`. */
export function todayInFortaleza(agora: Date = new Date()): string {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_FORTALEZA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA formata datas como YYYY-MM-DD.
  return formato.format(agora);
}

/** Evento vigente na data de referência (encerra-se no fim do endDate). */
export function isEventVisibleOn(endDate: string, dataReferencia: string): boolean {
  return endDate >= dataReferencia;
}
