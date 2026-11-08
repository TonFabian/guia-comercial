/** Converte "HH:MM" em minutos desde a meia-noite; null quando inválido. */
export function toMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  if (hora > 23 || minuto > 59) return null;
  return hora * 60 + minuto;
}

/** Converte minutos desde a meia-noite em "HH:MM". */
export function toTime(minutes: number): string {
  const hora = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minuto = String(minutes % 60).padStart(2, '0');
  return `${hora}:${minuto}`;
}

/** Faixa válida: abertura diferente do fechamento (meia-noite permitida). */
export function isValidRange(opens: number, closes: number): boolean {
  return opens !== closes;
}