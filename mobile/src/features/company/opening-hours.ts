/**
 * Regras puras de horário de funcionamento.
 *
 * Os horários chegam como texto livre ("Seg a Sex: 08h às 18h"), então a
 * análise é feita por heurística. Quando o texto não permite concluir o
 * horário, a informação é marcada como desconhecida em vez de inventada.
 */

export interface OpeningHour {
  /** Texto original como veio do backend. */
  raw: string;
  /** Rótulo dos dias ("Seg a Sex", "Sáb", "Todos os dias"). */
  label: string;
  /** Dias da semana (0 = domingo ... 6 = sábado). Vazio = não informado. */
  days: number[];
  /** Minutos desde a meia-noite. `null` = horário não informado. */
  opens: number | null;
  /** Minutos desde a meia-noite. `null` = horário não informado. */
  closes: number | null;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const WEEKDAY_TOKENS: Record<string, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

const WEEKDAY_PATTERN = /\b(dom|seg|ter|qua|qui|sex|sab)\b/g;
const WEEKDAY_RANGE_PATTERN =
  /\b(dom|seg|ter|qua|qui|sex|sab)\s+(?:a|e|ate|-|–)\s+\b(dom|seg|ter|qua|qui|sex|sab)\b/;
const TIME_PATTERN = /(\d{1,2})\s*[h:]\s*([0-5]?\d)?/g;

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

/** Descobre os dias da semana citados no rótulo do horário. */
function parseDays(label: string): number[] {
  const text = normalize(label);
  if (text.includes('todos os dias')) return [...ALL_DAYS];

  const range = WEEKDAY_RANGE_PATTERN.exec(text);
  if (range) {
    const start = WEEKDAY_TOKENS[range[1] ?? ''];
    const end = WEEKDAY_TOKENS[range[2] ?? ''];
    if (start !== undefined && end !== undefined) return expandDays(start, end);
  }

  const days = new Set<number>();
  for (const match of text.matchAll(WEEKDAY_PATTERN)) {
    const day = WEEKDAY_TOKENS[match[0]];
    if (day !== undefined) days.add(day);
  }
  return [...days].sort((a, b) => a - b);
}

/** Extrai os horários (em minutos) citados no texto. */
function parseTimes(text: string): number[] {
  const times: number[] = [];
  for (const match of text.matchAll(TIME_PATTERN)) {
    const hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    times.push(hour * 60 + minute);
  }
  return times;
}

/** Separa o rótulo (dias) dos horários (faixa de abertura). */
function splitLabelAndTimes(raw: string): { label: string; times: number[] } {
  const text = normalize(raw);
  const times = parseTimes(text);
  const colonIndex = text.indexOf(':');

  let labelEnd = colonIndex >= 0 ? colonIndex : text.length;
  if (colonIndex < 0 && times.length > 0) {
    const firstTimeIndex = text.search(/\d{1,2}\s*[h:]/);
    if (firstTimeIndex > 0) labelEnd = firstTimeIndex;
  }

  const label = raw.slice(0, labelEnd).trim();
  return { label: label || raw, times };
}

/**
 * Converte os horários textuais da empresa em faixas de abertura.
 * Uma faixa só é considerada válida quando há dia e dois horários.
 */
export function parseOpeningHours(hours: string[]): OpeningHour[] {
  return hours.map((raw) => {
    const { label, times } = splitLabelAndTimes(raw);
    const hasRange = times.length >= 2;
    return {
      raw,
      label,
      days: parseDays(label),
      opens: hasRange ? (times[0] ?? null) : null,
      closes: hasRange ? (times[1] ?? null) : null,
    };
  });
}

function isWithinRange(hour: OpeningHour, minutes: number): boolean {
  const opens = hour.opens ?? 0;
  const closes = hour.closes ?? 0;
  if (closes >= opens) return minutes >= opens && minutes <= closes;
  // Faixa que atravessa a meia-noite (ex.: 18h às 02h).
  return minutes >= opens || minutes <= closes;
}

/**
 * Diz se a empresa está aberta no instante informado.
 * `null` significa que o horário não pôde ser interpretado.
 */
export function isOpenNow(hours: OpeningHour[], now: Date): boolean | null {
  const known = hours.filter((hour) => hour.days.length > 0 && hour.opens !== null && hour.closes !== null);
  if (known.length === 0) return null;

  const today = known.filter((hour) => hour.days.includes(now.getDay()));
  if (today.length === 0) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  return today.some((hour) => isWithinRange(hour, minutes));
}

/** Texto curto do status de funcionamento para exibir na tela. */
export function openingStatusLabel(hours: OpeningHour[], now: Date): string {
  const status = isOpenNow(hours, now);
  if (status === null) return 'Horário não informado';
  return status ? 'Aberto agora' : 'Fechado agora';
}

/** Formata minutos desde a meia-noite como "08h" ou "08h30". */
export function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const label = String(hour).padStart(2, '0');
  return rest > 0 ? `${label}h${String(rest).padStart(2, '0')}` : `${label}h`;
}

/** Faixa de abertura legível; mantém o texto original quando não dá para interpretar. */
export function formatOpeningRange(hour: OpeningHour): string {
  if (hour.opens === null || hour.closes === null) return hour.raw;
  return `${formatMinutes(hour.opens)} às ${formatMinutes(hour.closes)}`;
}
