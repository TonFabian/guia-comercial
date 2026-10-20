import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { GuiaColors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const DarkGuiTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: GuiaColors.background,
    card: GuiaColors.background,
    primary: GuiaColors.primary,
    text: GuiaColors.text,
  },
};

export default function TabLayout() {
  return (
    <ThemeProvider value={DarkGuiTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
