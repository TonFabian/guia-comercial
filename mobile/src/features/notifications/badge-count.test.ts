import { describe, it, expect } from 'vitest';
import { formatBadgeCount } from './badge-count';

describe('formatBadgeCount', () => {
  it('zero → vazio', () => expect(formatBadgeCount(0)).toBe(''));
  it('1 → "1"', () => expect(formatBadgeCount(1)).toBe('1'));
  it('99 → "99"', () => expect(formatBadgeCount(99)).toBe('99'));
  it('100 → "99+"', () => expect(formatBadgeCount(100)).toBe('99+'));
  it('negativo → vazio', () => expect(formatBadgeCount(-3)).toBe(''));
});
