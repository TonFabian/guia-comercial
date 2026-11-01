import type { WorkingHours } from './company-details';

export type OpeningStatus = 'open' | 'closed' | 'unknown';

type OpeningRange = {
  open: number;
  close: number;
};

const OPEN_24H = /24\s*h|24\s*horas|aberto\s*24/i;
const CLOSED = /fechado/i;
const OPEN_UNTIL = /aberto\s+at[ée]\s+(\d{1,2})(?:[:h]\s*(\d{2}))?/i;
const RANGE =
  /(\d{1,2})(?:[:h]\s*(\d{2}))?\s*(?:h)?\s*(?:[–\-—]|às|as|a)\s*(\d{1,2})(?:[:h]\s*(\d{2}))?/i;

function toMinutes(hour: string, minute?: string): number {
  return Number(hour) * 60 + Number(minute ?? 0);
}

function parseRange(rawHours: string): OpeningRange | 'closed' | 'open24' | 'unknown' {
  const value = rawHours.trim();

  if (!value) return 'unknown';
  if (CLOSED.test(value)) return 'closed';
  if (OPEN_24H.test(value)) return 'open24';

  const untilMatch = value.match(OPEN_UNTIL);
  if (untilMatch) {
    return { open: 0, close: toMinutes(untilMatch[1], untilMatch[2]) };
  }

  const rangeMatch = value.match(RANGE);
  if (!rangeMatch) return 'unknown';

  const open = toMinutes(rangeMatch[1], rangeMatch[2]);
  const close = toMinutes(rangeMatch[3], rangeMatch[4]);

  if (open === close) return 'open24';

  return { open, close };
}

function hoursForDate(hours: WorkingHours, date: Date): string {
  const day = date.getDay();

  if (day === 0) return hours.sunday;
  if (day === 6) return hours.saturday;
  return hours.weekdays;
}

/** Calcula se a empresa está aberta no momento informado. */
export function getOpeningStatus(hours: WorkingHours, date: Date): OpeningStatus {
  const range = parseRange(hoursForDate(hours, date));

  if (range === 'unknown') return 'unknown';
  if (range === 'closed') return 'closed';
  if (range === 'open24') return 'open';

  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  if (range.open < range.close) {
    return currentMinutes >= range.open && currentMinutes < range.close ? 'open' : 'closed';
  }

  return currentMinutes >= range.open || currentMinutes < range.close ? 'open' : 'closed';
}
