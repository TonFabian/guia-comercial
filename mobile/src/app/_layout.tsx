import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { GuiaColors } from '@/constants/theme';
import { FavoritesProvider } from '@/features/favorites/favorites-provider';

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

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkGuiTheme}>
      <FavoritesProvider>
        <AnimatedSplashOverlay />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: GuiaColors.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="company/[id]" />
        </Stack>
      </FavoritesProvider>
    </ThemeProvider>
  );
}
