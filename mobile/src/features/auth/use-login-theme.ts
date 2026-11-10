import { useThemeMode } from '@/providers/theme-provider';
import { LoginColorsDark, LoginColorsLight, LoginGradientsDark, LoginGradientsLight } from '@/constants/theme';

export type LoginColors = typeof LoginColorsDark | typeof LoginColorsLight;
export type LoginGradients = typeof LoginGradientsDark | typeof LoginGradientsLight;

export function useLoginColors(): LoginColors {
  const { mode } = useThemeMode();
  return mode === 'dark' ? LoginColorsDark : LoginColorsLight;
}

export function useLoginGradients(): LoginGradients {
  const { mode } = useThemeMode();
  return mode === 'dark' ? LoginGradientsDark : LoginGradientsLight;
}

export function useLoginTheme() {
  return { colors: useLoginColors(), gradients: useLoginGradients() };
}