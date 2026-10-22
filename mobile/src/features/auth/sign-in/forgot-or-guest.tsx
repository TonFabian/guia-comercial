import { TouchableOpacity, StyleSheet, Text } from 'react-native';

import { GuiaColors, Spacing, Type } from '@/constants/theme';
import { useAuthState } from '@/providers/auth-provider';
import { router } from 'expo-router';

/**
 * Link discreto do rodapé do sign-in: entra como convidado (dados limitados
 * no backend via scrub de contato) e vai para as abas.
 */
export function ForgotOrGuest() {
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

const styles = StyleSheet.create({
  link: {
    alignSelf: 'center',
    paddingBottom: Spacing.four,
  },
  text: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
    textDecorationLine: 'underline',
  },
});
