/**
 * Regra de expiração de eventos por DATA (spec D9).
 *
 * Só lidamos com strings de data pura (formato fixo YYYY-MM-DD) — nunca com
 * datetime ISO: comparações lexicográficas só são corretas nesse formato.
 * O "hoje" do guia é o dia de Brasília (UTC-3, sem horário de verão).
 */

// America/Sao_Paulo é o identificador canônico IANA do horário de Brasília
// (BRT, UTC-3). O link America/Brasilia não está no ICU enxuto do Node —
// Intl rejeita com "Invalid time zone" (testado no runtime deste repo).
const FUSO_BRASILIA = 'America/Sao_Paulo';

/** Dia de hoje no fuso do guia, como `YYYY-MM-DD`. */
export function todayInBrasilia(agora: Date = new Date()): string {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_BRASILIA,
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
