import { describe, expect, it } from 'vitest';

import { resolveThemeMode } from './theme-mode';

describe('resolveThemeMode', () => {
  it('usa escuro quando não há preferência salva', () => {
    expect(resolveThemeMode(null)).toBe('dark');
  });

  it('respeita a preferência clara', () => {
    expect(resolveThemeMode('light')).toBe('light');
  });

  it('respeita a preferência escura', () => {
    expect(resolveThemeMode('dark')).toBe('dark');
  });

  it('usa escuro para valor inválido', () => {
    expect(resolveThemeMode('system')).toBe('dark');
  });
});
