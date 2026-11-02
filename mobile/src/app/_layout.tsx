import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ThemeProvider as RouterThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DarkGuiTheme, GuiaColors } from '@/constants/theme';
import { FavoritesProvider } from '@/features/favorites/favorites-provider';
import { AuthProvider } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Providers de autenticação: com chave do Clerk, sessão real (tokens no
 * SecureStore); sem chave, o AuthProvider entra em modo dev autenticado —
 * o app inteiro funciona com os mocks, como sempre.
 */
function AuthProviders({ children }: { children: ReactNode }) {
  if (!PUBLISHABLE_KEY) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <AuthProvider>{children}</AuthProvider>
    </ClerkProvider>
  );
}

export default function RootLayout() {
  return (
    <RouterThemeProvider value={DarkGuiTheme}>
      <AuthProviders>
        <FavoritesProvider>
          <AnimatedSplashOverlay />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: GuiaColors.background },
            }}
          />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="company/[id]" />
        </FavoritesProvider>
      </AuthProviders>
    </RouterThemeProvider>
  );
}
