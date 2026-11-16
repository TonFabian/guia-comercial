import { describe, it, expect } from 'vitest';
import { tempoRelativo } from './tempo-relativo';

describe('tempoRelativo', () => {
  const agora = new Date('2026-11-16T12:00:00.000Z');
  it('agora', () => expect(tempoRelativo('2026-11-16T12:00:00.000Z', agora)).toBe('agora'));
  it('minutos', () => expect(tempoRelativo('2026-11-16T11:45:00.000Z', agora)).toBe('15 min'));
  it('horas', () => expect(tempoRelativo('2026-11-16T09:00:00.000Z', agora)).toBe('3 h'));
  it('dias', () => expect(tempoRelativo('2026-11-14T12:00:00.000Z', agora)).toBe('2 d'));
  it('futuro', () => expect(tempoRelativo('2026-11-16T13:00:00.000Z', agora)).toBe('agora'));
  it('inválido', () => expect(tempoRelativo(null, agora)).toBe(''));
});
