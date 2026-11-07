export interface ScheduleItem {
  /** Dia da semana (0 = domingo ... 6 = sábado). */
  day: number;
  /** Minutos desde a meia-noite (0–1439). */
  opens: number;
  /** Minutos desde a meia-noite (0–1439); menor que opens = fecha no dia seguinte. */
  closes: number;
}

/**
 * Regras puras de conversão de `openingHours` (texto livre) para `schedule`
 * estruturado (minutos desde a meia-noite, 0–1439).
 *
 * Uma linha cobre um intervalo de dias e uma faixa de horários; cada dia do
 * intervalo vira um item próprio. Linha não parseável nunca é inventada: quem
 * chama decide manter o texto original (migração) ou descartar.
 */

const DAY_TOKENS: Record<string, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const DAY_TOKEN_PATTERN = /\b(dom|seg|ter|qua|qui|sex|sab)\b/g;
const DAY_RANGE_PATTERN =
  /\b(dom|seg|ter|qua|qui|sex|sab)\s*(?:a|e|ate|-|–)\s*(dom|seg|ter|qua|qui|sex|sab)\b/;
const TIME_PATTERN = /(\d{1,2})\s*[h:]\s*(\d{1,2})?/g;

/** Remove acentos e caixa para comparar textos em português. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Expande um intervalo de dias, atravessando o fim de semana quando preciso. */
function expandDays(start: number, end: number): number[] {
  const days: number[] = [];
  let current = start;
  while (true) {
    days.push(current);
    if (current === end) break;
    current = (current + 1) % 7;
  }
  return days;
}

/** Descobre os dias da semana citados no rótulo da linha. */
function parseDays(label: string): number[] {
  const text = normalize(label);
  if (text.includes('todos os dias')) return [...ALL_DAYS];

  const range = DAY_RANGE_PATTERN.exec(text);
  if (range) {
    const start = DAY_TOKENS[range[1] ?? ''];
    const end = DAY_TOKENS[range[2] ?? ''];
    if (start !== undefined && end !== undefined) return expandDays(start, end);
  }

  const days = new Set<number>();
  for (const match of text.matchAll(DAY_TOKEN_PATTERN)) {
    const day = DAY_TOKENS[match[0]];
    if (day !== undefined) days.add(day);
  }
  return [...days].sort((a, b) => a - b);
}

/** Extrai as faixas de horário (em minutos) citadas no texto. */
function parseTimes(text: string): number[] | null {
  const times: number[] = [];
  for (const match of text.matchAll(TIME_PATTERN)) {
    const hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    // 0–1439: "24h" e derivados não são horário válido.
    if (hour > 23 || minute > 59) return null;
    times.push(hour * 60 + minute);
  }
  return times;
}

/**
 * Converte uma linha de horário textual em itens de schedule (um por dia).
 * Retorna null quando a linha não é parseável ou está incompleta.
 */
export function parseOpeningHoursString(line: string): ScheduleItem[] | null {
  const text = normalize(line);
  if (!text.trim()) return null;

  const times = parseTimes(text);
  if (!times || times.length < 2) return null;

  // Rótulo de dias: do início até o primeiro horário (colon é opcional).
  const firstTimeIndex = text.search(/\d{1,2}\s*[h:]/);
  if (firstTimeIndex <= 0) return null;
  const days = parseDays(text.slice(0, firstTimeIndex));
  if (days.length === 0) return null;

  const [opens, closes] = times;
  return days.map((day) => ({ day, opens, closes }));
}

/**
 * Converte todas as linhas de openingHours em schedule, ignorando as
 * inválidas (a responsabilidade de preservá-las é de quem chama).
 */
export function convertOpeningHoursToSchedule(
  openingHours: string[],
): ScheduleItem[] {
  return openingHours.flatMap((line) => parseOpeningHoursString(line) ?? []);
}

/** Minutos desde a meia-noite do instante (horário local). */
function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Diz se a empresa está aberta no instante, a partir do schedule estruturado.
 * `closes < opens` significa que a faixa atravessa a meia-noite.
 * Schedule vazio = fechado (o fallback para openingHours é de quem chama).
 */
export function isCompanyOpen(schedule: ScheduleItem[], now: Date): boolean {
  const minutes = minutesOfDay(now);
  const day = now.getDay();
  const dayAnterior = (day + 6) % 7;

  return schedule.some((item) => {
    if (item.closes > item.opens) {
      return item.day === day && minutes >= item.opens && minutes < item.closes;
    }
    if (item.closes < item.opens) {
      // Faixa noturna: ainda no próprio dia (após opens) ou na madrugada do dia seguinte.
      if (item.day === day) return minutes >= item.opens;
      return item.day === dayAnterior && minutes < item.closes;
    }
    // closes === opens: faixa vazia, nunca aberto.
    return false;
  });
}
