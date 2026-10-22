import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import { useAuthState } from '@/providers/auth-provider';

/**
 * Aviso fixo no topo da home para convidados: os dados comerciais vêm
 * redigidos do backend e o CTA leva ao login.
 */
export function GuestBanner({ onSignIn }: { onSignIn?: () => void }) {
  const { state } = useAuthState();

  if (state !== 'guest') {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="lock-closed" size={16} color={GuiaColors.primary} />
      <Text style={styles.text}>Você está navegando como convidado — entre para ver contatos e cupons</Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={onSignIn ?? (() => router.push('/(auth)/sign-in'))}
        role="button"
        accessibilityLabel="Entrar na conta"
      >
        <Text style={styles.ctaText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: 16,
    marginBottom: Spacing.two,
    backgroundColor: GuiaColors.surfaceAlt,
    borderColor: GuiaColors.primaryDim,
    borderWidth: 1,
    borderRadius: Radius.chip,
    padding: Spacing.two + 2,
  },
  text: {
    flex: 1,
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
  },
  cta: {
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.tag,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
  },
  ctaText: {
    color: GuiaColors.background,
    fontSize: Type.small,
    fontWeight: '700',
  },
});
