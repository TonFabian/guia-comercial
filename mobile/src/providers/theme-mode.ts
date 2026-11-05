export type ThemeMode = 'light' | 'dark';

export function resolveThemeMode(stored: string | null): ThemeMode {
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
}
