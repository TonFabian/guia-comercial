import { Stack } from 'expo-router';

/**
 * Área de login: telas sem header (a tela de sign-in é toda customizada).
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
