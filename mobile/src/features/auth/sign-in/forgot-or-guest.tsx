import { TouchableOpacity, StyleSheet, Text } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuthState } from '@/providers/auth-provider';
import { router } from 'expo-router';

/**
 * Link discreto do rodapé do sign-in: entra como convidado (dados limitados
 * no backend via scrub de contato) e vai para as abas.
 */
export function ForgotOrGuest() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { enterAsGuest } = useAuthState();

  function enter() {
    enterAsGuest();
    router.replace('/(tabs)');
  }

  return (
    <TouchableOpacity
      style={styles.link}
      onPress={enter}
      role="button"
      accessibilityLabel="Entrar como convidado e navegar com dados limitados"
    >
      <Text style={styles.text}>Entrar como convidado</Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    link: {
      alignSelf: 'center',
      paddingBottom: Spacing.four,
    },
    text: {
      color: colors.textSecondary,
      fontSize: Type.small,
      textDecorationLine: 'underline',
    },
  });
}
