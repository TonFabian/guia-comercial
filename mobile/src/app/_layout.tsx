import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts as useRubikFonts,
} from '@expo-google-fonts/rubik';
import { ThemeProvider as RouterThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import {
  DarkGuiTheme,
  GuiaColors,
  GuiaColorsLight,
  LightGuiTheme,
  MaxContentWidth,
} from '@/constants/theme';
import { FavoritesProvider } from '@/features/favorites/favorites-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { NotificationsProvider } from '@/providers/notifications-provider';
import { ThemeProvider, useThemeMode } from '@/providers/theme-provider';
import { useThemeColors } from '@/hooks/use-theme-colors';

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

/**
 * Canvas centralizado do app: em telas mais largas que MaxContentWidth
 * (desktop/tablet/landscape) o conteúdo fica limitado a 800dp no centro;
 * em celulares o maxWidth não atinge e a tela continua inalterada.
 */
function AppCanvas({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={[appCanvasStyles.canvas, { backgroundColor: colors.background }]}>
      <View style={appCanvasStyles.content}>{children}</View>
    </View>
  );
}

function ThemedStack() {
  const { mode } = useThemeMode();
  const colors = mode === 'dark' ? GuiaColors : GuiaColorsLight;
  const routerTheme = mode === 'dark' ? DarkGuiTheme : LightGuiTheme;
  return (
    <RouterThemeProvider value={routerTheme}>
      <AuthProviders>
        <FavoritesProvider>
          <AnimatedSplashOverlay />
          <AppCanvas>
            <NotificationsProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
            </NotificationsProvider>
          </AppCanvas>
        </FavoritesProvider>
      </AuthProviders>
    </RouterThemeProvider>
  );
}

export default function RootLayout() {  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [rubikLoaded, rubikError] = useRubikFonts({
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });
  const fontError = interError ?? rubikError;
  const fontsLoaded = interLoaded && rubikLoaded;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null; // splash mantido

  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}

const appCanvasStyles = StyleSheet.create({
  canvas: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
