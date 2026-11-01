import { GuiaColors, GuiaColorsLight } from '@/constants/theme';
import { useThemeMode } from '@/providers/theme-provider';

export function useThemeColors() {
  const { mode } = useThemeMode();
  return mode === 'dark' ? GuiaColors : GuiaColorsLight;
}
