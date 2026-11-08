/**
 * Regras puras do editor estruturado de horário (grade de 7 dias com
 * faixas em minutos). Da grade sai o `schedule` enviado ao backend.
 */
import type { OpeningHour } from './opening-hours';
import { formatMinutes, scheduleToOpeningHours } from './opening-hours';

/** Estado de um dia na grade de edição (strings mantidas como digitação). */
export type DayState = {
  /** Dia da semana (0 = domingo ... 6 = sábado). */
  day: number;
  /** Dia com funcionamento marcado. */
  isOpen: boolean;
  /** Horário de abertura digitado ("HH:mm" ou "HHh"). */
  opens: string;
  /** Horário de fechamento digitado ("HH:mm" ou "HHh"). */
  closes: string;
};

/** Converte o valor digitado em minutos desde a meia-noite; null quando inválido. */
export function parseTimeInput(value: string): number | null {
  const texto = value.trim().replace(/h$/i, '');
  if (texto === '') return null;
  const match = texto.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;
  const hora = Number(match[1]);
  const minuto = match[2] !== undefined ? Number(match[2]) : 0;
  if (hora > 23 || minuto > 59 || Number.isNaN(minuto)) return null;
  return hora * 60 + minuto;
}

/** Converte minutos desde a meia-noite no texto "HH:mm" exibido na grade. */
export function formatTimeInput(minutes: number): string {
  const hora = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minuto = String(minutes % 60).padStart(2, '0');
  return `${hora}:${minuto}`;
}

/** Grade vazia de 7 dias (domingo a sábado). */
function gradeVazia(): DayState[] {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    isOpen: false,
    opens: '',
    closes: '',
  }));
}

/** Aproveita a interpretação de horários (estruturados ou texto livre) na grade. */
function estadosDeFaixas(faixas: OpeningHour[]): DayState[] {
  const estados = gradeVazia();
  for (const faixa of faixas) {
    if (faixa.opens === null || faixa.closes === null) continue;
    for (const day of faixa.days) {
      estados[day] = { day, isOpen: true, opens: formatTimeInput(faixa.opens), closes: formatTimeInput(faixa.closes) };
    }
  }
  return estados;
}

/** Grade preenchida a partir de um schedule estruturado. */
export function scheduleToDayStates(schedule: { day: number; opens: number; closes: number }[]): DayState[] {
  return estadosDeFaixas(scheduleToOpeningHours(schedule));
}

/** Grade preenchida a partir de openingHours textual (fallback da deprecação). */
export function openingHoursToDayStates(openingHours: OpeningHour[]): DayState[] {
  return estadosDeFaixas(openingHours);
}

/** Minutos válidos para o custo do schedule: 0–1439, abertura antes do fechamento no mesmo instante não permitida. */
function faixaValida(opens: number, closes: number): boolean {
  return opens >= 0 && closes <= 1439 && opens !== closes;
}

/** Da grade para o schedule: só dias abertos com faixa válida, sempre por dia. */
export function dayStatesToSchedule(estados: DayState[]): { day: number; opens: number; closes: number }[] {
  const schedule: { day: number; opens: number; closes: number }[] = [];
  for (const estado of [...estados].sort((a, b) => a.day - b.day)) {
    if (!estado.isOpen) continue;
    const opens = parseTimeInput(estado.opens);
    const closes = parseTimeInput(estado.closes);
    if (opens === null || closes === null || !faixaValida(opens, closes)) continue;
    schedule.push({ day: estado.day, opens, closes });
  }
  return schedule;
}

/** Rótulo legível de uma faixa para exibição ("08h às 18h"); "—" quando vazia. */
export function faixaComoTexto(estado: DayState): string {
  const opens = parseTimeInput(estado.opens);
  const closes = parseTimeInput(estado.closes);
  if (opens === null || closes === null) return 'Horário incompleto';
  return `${formatMinutes(opens)} às ${formatMinutes(closes)}`;
}
