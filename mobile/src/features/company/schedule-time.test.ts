import { describe, expect, it } from 'vitest';
import { toMinutes, toTime, isValidRange } from './schedule-time';

describe('schedule-time', () => {
  it('toMinutes parses HH:MM', () => {
    expect(toMinutes('08:30')).toBe(510);
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('23:59')).toBe(1439);
  });
  it('toMinutes returns null for invalid', () => {
    expect(toMinutes('24:00')).toBeNull();
    expect(toMinutes('08:60')).toBeNull();
    expect(toMinutes('abc')).toBeNull();
    expect(toMinutes('8:30')).toBeNull();
  });
  it('toTime formats minutes', () => {
    expect(toTime(510)).toBe('08:30');
    expect(toTime(0)).toBe('00:00');
    expect(toTime(1439)).toBe('23:59');
  });
  it('isValidRange opens !== closes, midnight ok', () => {
    expect(isValidRange(0, 1439)).toBe(true);
    expect(isValidRange(0, 0)).toBe(false);
    expect(isValidRange(510, 510)).toBe(false);
    expect(isValidRange(1080, 0)).toBe(true);
  });
});