/** Item de horário de funcionamento estruturado (minutos desde 00:00). */
export interface ScheduleItem {
  day: number; // 0 = domingo ... 6 = sábado
  opens: number; // 0–1439
  closes: number; // 0–1439; closes < opens atravessa a meia-noite
}
