import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuthState } from '@/providers/auth-provider';

/**
 * Aviso fixo no topo da home para convidados: os dados comerciais vêm
 * redigidos do backend e o CTA leva ao login.
 */
export function GuestBanner({ onSignIn }: { onSignIn?: () => void }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { state } = useAuthState();

  if (state !== 'guest') {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="lock-closed" size={16} color={colors.primary} />
      <Text style={styles.text}>
        Você está navegando como convidado — entre para salvar favoritos e acessar utilidades
      </Text>
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      marginHorizontal: 16,
      marginBottom: Spacing.four,
      backgroundColor: Overlays.amberGlow,
      borderColor: colors.primaryDim,
      borderWidth: 1,
      borderRadius: Radius.chip,
      padding: Spacing.two + 2,
    },
    text: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: Type.small,
    },
    cta: {
      backgroundColor: colors.primary,
      borderRadius: Radius.tag,
      paddingVertical: Spacing.one + 2,
      paddingHorizontal: Spacing.three,
    },
    ctaText: {
      color: colors.background,
      fontSize: Type.small,
      fontWeight: '700',
    },
  });
}
